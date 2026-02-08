let http = require('http')
let app = require('./app')

http.createServer(app).listen(process.env.PORT)