import fetch from 'node-fetch'

const isDev = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development'

// /modules?year=${year}&session=${session}
export default async function (context, req) {
    const SOURCE = isDev ? 'http://localhost:3000' : 'https://raw.githubusercontent.com/anucssa/anutimetable/master/public'
    const TIMETABLE_JSON = `${SOURCE}/timetable_data/${req.query.year}/${req.query.session}.min.json`

    let modules
    try {
        modules = await fetch(TIMETABLE_JSON).then(res => res.json())
    } catch (e) {
        const err = "Couldn't load timetable data"
        context.log.error(err+`: ${e}`)
        context.res = {
            status: 503,
            body: err
        }
    }

    const dropClasses = ({classes, id, title, ...module}) => ({ title: title.replace(/_[A-Z][1-9]/, ''), ...module })

    context.res = {
        body: Object.entries(modules).reduce((acc, [key, module]) => ({...acc, [key.split('_')[0]]: dropClasses(module)}),{})
    }
}
