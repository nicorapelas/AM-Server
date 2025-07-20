require('./models/User')
require('./models/Payment')
require('./models/PaymentHistory')
require('./models/Store')
require('./models/Game')
require('./models/Financial')
require('./models/Staff')
require('./models/Support')
const express = require('express')
const path = require('path')
const exphbs = require('express-handlebars')
const cookieParser = require('cookie-parser')

// Run Express
const app = express()

app.use(cookieParser())

// Request logging middleware
// app.use((req, res, next) => {
//   console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
//   console.log('Headers:', req.headers);
//   next();
// });

require('./startup/routes')(app)
require('./startup/db')()

// Error logging middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  console.error('Request headers:', req.headers);
  console.error('Request origin:', req.headers.origin);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Handlebars middleware
app.engine(
  'handlebars',
  exphbs.engine({
    layoutsDir: __dirname + '/views/layouts',
  })
)

// Set static folder
app.use(express.static(path.join(__dirname, 'public')))

// Production Setup
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'))
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'))
  })
}
// Server Port
const port = process.env.PORT || 5000
const server = app.listen(port, () => console.log(`Listening on port ${port}`))
module.exports = server
