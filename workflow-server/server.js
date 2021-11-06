const fs = require('fs')
const bodyParser = require('body-parser')
const jsonServer = require('json-server')
const jwt = require('jsonwebtoken')

const server = jsonServer.create()
const router = jsonServer.router('./server-mockdata/database.json')
const userdb = JSON.parse(fs.readFileSync('./server-mockdata/user.json', 'UTF-8'))

server.use(bodyParser.urlencoded({ extended: true }))
server.use(bodyParser.json())
server.use(jsonServer.defaults());

const SECRET_KEY = 'pj.workflow'

const expiresIn = '1h'

// Create a token from a payload 
function createToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn })
}

// Verify the token 
function verifyToken(token) {
  return jwt.verify(token, SECRET_KEY, (err, decode) => decode !== undefined ? decode : err)
}

// Check if the user exists in database
function isAuthenticated({ username, password }) {
  return userdb.users.findIndex(user => user.username === username && user.password === password) !== -1
}

function isExistUser({ username, email }) {
  return userdb.users.findIndex(user => user.username === username && user.email === email) !== -1
}

// Register New User
server.post('/auth/register', (req, res) => {
  console.log("register endpoint called; request body:");
  const { username, password, email } = req.body;
  if (isExistUser({ username, email }) === true) {
    const status = 401;
    const message = 'User already exist';
    res.status(status).json({ status, message });
    return
  }
  let last_item_id 
  fs.readFile("./server-mockdata/user.json", (err, data) => {
    if (err) {
      const status = 401
      const message = err
      res.status(status).json({ status, message })
      return
    };

    // Get current users data
    let Users = JSON.parse(data.toString());

    // Get the id of last user
    last_item_id = Users.users[Users.users.length - 1].id;

    //Add new user
    Users.users.push({ id: last_item_id + 1, username: username, password: password, email: email }); //add some data
    let writeData = fs.writeFile("./server-mockdata/user.json", JSON.stringify(Users), (err, result) => {  // WRITE
      if (err) {
        const status = 401
        const message = err
        res.status(status).json({ status, message })
        return
      }
    });
  });

  // Create token for new user
  const access_token = createToken({ id: last_item_id, username, password })
  console.log("Access Token:" + access_token);
  res.status(200).json({ access_token })
})

// Login to one of the users from ./users.json
server.post('/auth/login', (req, res) => {
  console.log("login endpoint called; request body:");
  console.log(req.body);
  const { username, password } = req.body;
  if (isAuthenticated({ username, password }) === false) {
    const status = 401
    const message = 'Incorrect Username or Password'
    res.status(status).json({ status, message })
    return
  }
  const User = userdb.users.find(user => user.username === username && user.password === password)

  const access_token = createToken({ id: User.id, username: username, email: User.email })
  console.log("Access Token:" + access_token);
  res.status(200).json({ access_token })
})

server.use(/^(?!\/auth).*$/, (req, res, next) => {
  if (req.headers.authorization === undefined || req.headers.authorization.split(' ')[0] !== 'Bearer') {
    const status = 401
    const message = 'Error Unauthorization'
    res.status(status).json({ status, message })
    return
  }
  try {
    let verifyTokenResult;
    verifyTokenResult = verifyToken(req.headers.authorization.split(' ')[1]);

    if (verifyTokenResult instanceof Error) {
      const status = 401
      const message = 'Access token not provided'
      res.status(status).json({ status, message })
      return
    }
    next()
  } catch (err) {
    const status = 401
    const message = 'Error access_token is revoked'
    res.status(status).json({ status, message })
  }
})

server.use(router)

server.listen(3000, () => {
  console.log('Run Auth API Server')
})