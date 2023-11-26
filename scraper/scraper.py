#!/usr/bin/env python3

import requests
import pprint
import time
from bs4 import BeautifulSoup
import sys
import json

from classes.course import (Course, splitHeaderTable)
from classes.coursesPage import (Chunk, CoursesPage)
from classes.sessionData import SessionData
from classes.loadingBar import printProgressBar
from classes.toJSON import formatCourses

URL = sys.argv[1] # eg 'http://timetabling.anu.edu.au/sws2022/'
# 1-indexed position of session
# as at 16.1.22, order is: S1, S2, X1, X2, X3, X4
SESSION_INDEX = int(sys.argv[2])
SESSION_ID = sys.argv[3] # eg 'S1'

# 1-50: 50 is the maximum allowed request
CHUNK = 50

start_time = time.time()
# Get landing page
print("Getting landing page...")
res = requests.get(URL)
cookies = res.cookies
landingSoup = BeautifulSoup(res.content, 'html.parser')

session = SessionData(landingSoup)
print("Got landing page! Getting list of courses...")
res = requests.post(URL, data=session.withTargetLinkType("LinkBtn_modules","information"), cookies=cookies)
cookies = res.cookies
session =  SessionData(BeautifulSoup(res.content, 'html.parser'))
coursesPage = CoursesPage(res)

coursesPage.courseList = list(filter(lambda x: f"_{SESSION_ID}" in x[0], coursesPage.courseList))

courseCount = len(coursesPage.courseList)
print(f"Found {courseCount} courses.")
if courseCount == 0:
    sys.exit(0)

body = coursesPage.getBody(SESSION_INDEX)
body = [(k, v) for k, v in body.items()]

courses = []
printProgressBar(0, courseCount)

# API to convert locationID (eg http://www.anu.edu.au/maps#show=11414) to coordinates
# Category ID can be extracted from the UI's checkbox labels
# Loads standard categories as basic cache
# Uncategorised locationIDs are loaded individually (/anu-campus-map/show/ID) and added to cache
# geodata = requests.get('https://www.anu.edu.au/anu-campus-map/list?categories[]=302&categories[]=640').json()

# ANU replaced that API with https://content.anu.edu.au/json/campus-poi/:guid, but no other params and we don't have guids. so we rely on historical data:
# $courses = Get-ChildItem timetable_data *.min.json -Recurse | Get-Content | ConvertFrom-Json
# $locations = $courses.PSObject.Properties.Value | % { $_.PSObject.Properties.Value.classes } | select location, locationID, lat, lon -Unique
# $items = $locations | where lat | select @{n="id";e={[int]$_.locationID.split("show=")[1]}}, @{n="point";e={@{latitude=[string]$_.lat;longitude=[string]$_.lon}}} -Unique
# @{items=$items} | ConvertTo-Json -Depth 5 | Out-File geodata.json

# if missing from the static data, we fall back to name search with the server-side rendered frontend: https://www.anu.edu.au/maps?campus=&type=&search=
# https://mytimetable.anu.edu.au/odd/rest/timetable/locations is a faster name search option, but all returned lat/lon are 0 as of writing
with open('geodata.json') as f:
    geodata = json.load(f)
    for courseCodes in Chunk(coursesPage, CHUNK):
        reqBody = [] + session.asModuleList() + body
        for code in courseCodes:
            reqBody.append(('dlObject', code[1]))
        res = requests.post(URL, data=reqBody, cookies=cookies)
        try:
            new = splitHeaderTable(res, geodata)
        except PermissionError:
            print("Request error!")
            exit(1)
        courses = courses + new
        printProgressBar(len(courses), courseCount)

formatCourses(courses)
print(f"Scraping complete, scraped {len(courses)} courses in total, time elapsed: { time.time() - start_time}s")
