from bs4 import BeautifulSoup
import itertools
from typing import List
import re
import requests
import json

def splitHeaderTable(res, geodata):
    soup = BeautifulSoup(res.content, 'html.parser')

    table = soup.find_all("tbody")
    header = soup.find_all('div', attrs={"data-role": "collapsible"})
    courses = []
    # print('-------------New page-------------')
    if len(table) == 0 or len(header) == 0:
        print(soup.prettify())
        raise PermissionError
    for (t, h) in itertools.zip_longest(table, header):
        c = Course(h, t, geodata)
        courses.append(c)
        # print(c)

    return courses


class Course:
    def __init__(self, header, table, geodata):
        self.title = re.sub("_\([0-9]+\)", '', header.find("h3").string.split(' (Class:')[0])
        self.id = re.sub("_\([0-9]+\)", '', header.find("a").string)
        self.link = header.find("a")['href']
        self.dates = header.find(
            'h3', class_="date-info-display").string.strip()
        self.classes: List[Lesson] = self._getClasses(table, geodata)

    def _getClasses(self, table, geodata):
        classes = []
        for row in table.find_all("tr"):
            try:
                classes.append(Lesson(row, geodata))
            except Exception as e:
                print("\nEncountered Exception while parsing course page:")
                print(f"{self}")
                print(f"Raw table data\n{row.prettify()}")
                raise e
        return classes

    def __str__(self):
        return f"{self.title} -- {self.dates}"


class Lesson:
    def __init__(self, row, geodata):
        cells = row.find_all("td")
        self.name = re.sub("_\([0-9]+\)", '', cells[0].a.next.strip())

        self.day = dayToNum(cells[1].string)
        self.start = cells[2].string
        self.finish = cells[3].string
        self.weeks = cells[5].a.string.strip()

        activity = re.search('-([A-Za-z]|[^\/\W])+', self.name)
        if activity:
            self.activity = activity.group(0)[1:]  # remove leading dash
        else:
            self.activity = 'Err'

        occurrence = re.search('/[0-9]+', self.name)

        # remove leading slash and default to 01 if unspecified
        self.occurrence = '01' if not occurrence else occurrence.group(0)[1:]

        locationCell = cells[7]
        if locationCell.a == None:
            self.location = locationCell.string
            self.locationID = ""
            return

        locationAs = locationCell.find_all("a")
        self.location = locationAs[0].string
        for a in locationAs[1:len(locationAs)]:
            self.location += "; " + a.string
        self.locationID = locationCell.a['href']

        # Wanted to use https://www.anu.edu.au/anu-campus-map/show/mapID
        # But took roughly 25x longer (1200s), and had no pagination or search options
        mapID = re.search('show=([0-9]+)', self.locationID)
        if mapID and mapID.group(1):
            mapID = int(mapID.group(1))

            for item in geodata['items']:
                if item['id'] == mapID:
                    # get cached geo directly or from related parent (eg building)
                    geo = item.get('point')
                    if not geo:
                        geo = geodata['points'][str(item['related_points'][0])]
                    self.lat = geo['latitude']
                    self.lon = geo['longitude']
                    return

            try:
                res = requests.get('https://www.anu.edu.au/maps?campus=&type=&search=' + self.location)
                soup = BeautifulSoup(res.content, 'html.parser')
                script = soup.find("script", attrs={"type": "application/json", "data-drupal-selector": "drupal-settings-json"})
                geo = json.loads(script.text).get('pois')[0]
                self.lat = str(geo['lat'])
                self.lon = str(geo['lng'])
                geodata['items'].append({'id': mapID, 'point': {'latitude': self.lat, 'longitude': self.lon}})
                # print(f"Cached location {mapID} for {self.location}")
            except:
                print(f"Could not find location for {self.name} at {self.location} ({mapID})")
                print(f"{self.locationID}")

    def __str__(self):
        return "{}: {}, {} {} - {}: {}h, Weeks: {}, {}".format(self.name, self.description,
                                                               self.day, self.start, self.finish, self.duration, self.weeks, self.location)


def dayToNum(s: str):
    days = {
        "Monday": 0,
        "Tuesday": 1,
        "Wednesday": 2,
        "Thursday": 3,
        "Friday": 4,
        "Saturday": 5,
        "Sunday": 6
    }
    return days.get(s, "Not found")
