export default async function (context, req) {
    context.res = {
        body: {
            2021: ['S1','S2','X1','X2','X3','X4'],
            2022: ['S1','S2','X1','X2','X3','X4'],
            2023: ['S1','S2','X1','X2','X3','X4']
        }
    }
}