const express = require('express');
const app = express();
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');

// database configuration, config in env
const dbConfig = {
    host: 'db',
    port: 5432,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
};

const db = pgp(dbConfig);

// test your database
db.connect()
    .then(obj => {
        console.log('Database connection successful'); // you can view this message in the docker compose logs
        obj.done(); // success, release the connection;
    })
    .catch(error => {
        console.log('ERROR:', error.message || error);
    });

app.set('view engine', 'ejs');

app.use(bodyParser.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        saveUninitialized: false,
        resave: false,
    })
);

app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

app.listen(3000);
console.log('Server is listening on port 3000');

app.get('/', (req, res) => {
    res.redirect('/login')
});

app.get('/register', (req, res) => {
    res.render('pages/register');
});

// Register submission
app.post('/register', async (req, res) => {
    const username = req.body.username;
    const hash = await bcrypt.hash(req.body.password, 10);

    let query = `INSERT INTO users (username, password) VALUES ('${username}', '${hash}');`;

    console.log(username, hash);

    db.any(query)
        .then((rows) => {
            res.render('pages/login');
        })
        .catch(function (err)  {
            res.render('pages/register', {
                error: true,
                message: "User already exists!"
            });
        });   
});

app.get('/login', (req, res) => {
    res.render('pages/login');
});

app.post('/login', async (req, res) => {
    const username = req.body.username;
    let query = `SELECT * FROM users WHERE users.username = '${username}';`;

    db.any(query)
        .then(async (user) => {
            const match = await bcrypt.compare(req.body.password, user[0].password);

            if (match) {
                req.session.user = {
                    api_key: process.env.API_KEY,
                };

                req.session.save();
                res.redirect('/game');
            }
            else {
                res.render('pages/register', {
                    error: true,
                    message: `Incorrect Password`
                });
            }
        })
        .catch((error) => {
            res.render('pages/login', {
                error: true,
                message: `Username Wasn't Recognized!`
            });
        })
});

// returns 10 highest scoring users in descending order
app.get('/leaderboard', function (req, res) {
    var query = "SELECT username, highscore FROM users ORDER BY users.highscore DESC LIMIT 10;";
    db.any(query)
      .then(function (rows) {
        res.send(rows);
      })
      .catch(function (err) {
        console.log(err);
      });
});

// Authentication Middleware.
const auth = (req, res, next) => {
    if (!req.session.user) {
        // Default to register page.
        return res.redirect('/register');
    }
    next();
};

// Authentication Required
app.use(auth);

app.get('/game', (req, res) => {
    res.render('pages/game');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.render('pages/login', {
        message: `Successfully Logged Out`,
    });
});

