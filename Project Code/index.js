const express = require("express");
const app = express();
const pgp = require("pg-promise")();
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");

// database configuration, config in env
const dbConfig = {
    host: "db",
    port: 5432,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
};

const db = pgp(dbConfig);

// test your database
db.connect()
    .then((obj) => {
        console.log("Database connection successful"); // you can view this message in the docker compose logs
        obj.done(); // success, release the connection;
    })
    .catch((error) => {
        console.log("ERROR:", error.message || error);
    });

app.set("view engine", "ejs");

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
console.log("Server is listening on port 3000");

app.get("/", (req, res) => {
    res.redirect("/login");
});

app.get("/register", (req, res) => {
    res.render("pages/register");
});

// Register submission
app.post("/register", async (req, res) => {
    const username = req.body.username;
    const hash = await bcrypt.hash(req.body.password, 10);

    let query = `INSERT INTO users (username, password) VALUES ('${username}', '${hash}');`;

    console.log(username, hash);

    db.any(query)
        .then((rows) => {
            res.render("pages/login");
        })
        .catch(function (err) {
            res.render("pages/register", {
                error: true,
                message: "User already exists!",
            });
        });
});

app.get("/login", (req, res) => {
    res.render("pages/login");
});

app.post("/login", async (req, res) => {
    const username = req.body.username;
    let query = `SELECT * FROM users WHERE users.username = '${username}';`;

    db.any(query)
        .then(async (user) => {
            const match = await bcrypt.compare(req.body.password, user[0].password);

            if (match) {
                req.session.user = {
                    api_key: process.env.API_KEY,
                    score: 0,
                    username: username,
                };

                req.session.save();
                if (username == "admin") {
                    res.redirect("/admin");
                }
                res.redirect("/game");
            } else {
                res.render("pages/register", {
                    error: true,
                    message: `Incorrect Password`,
                });
            }
        })
        .catch((error) => {
            res.render("pages/login", {
                error: true,
                message: `Username Wasn't Recognized!`,
            });
        });
});

// returns the top 10 users ordered by high scroe
app.get("/leaderboard", (req, res) => {
    let query = `SELECT * FROM users ORDER BY users.highscore DESC;`;
    db.any(query)
        .then((people) => {
            res.render("pages/leaderboard", {
                people,
            });
        })
        .catch((error) => {
            res.render("pages/leaderboard", {
                message: `Leaderboard Failed to Load`,
            });
        });
});

// Authentication Middleware.
const auth = (req, res, next) => {
    if (!req.session.user) {
        // Default to register page.
        return res.redirect("/register");
    }
    next();
};

// Authentication Required
app.use(auth);

app.get("/admin", (req, res) => {
    res.render("pages/admin");
});

app.get("/pictures", (req, res) => {
    let query = `SELECT * FROM images;`;
    db.any(query)
        .then((art) => {
            res.render("pages/pictures", {
                art,
            });
        })
        .catch((error) => {
            res.render("pages/pictures", {
                message: `Pictures Failed to Load`,
            });
        });
});

app.get("/pictures/delete", async (req, res) => {
    let query = `SELECT * FROM images;`;
    db.any(query)
        .then((art) => {
            res.render("pages/pictures", {
                art,
            });
        })
        .catch((error) => {
            res.render("pages/pictures", {
                message: `Pictures Failed to Load`,
            });
        });
});

app.post("/pictures/delete", async (req, res) => {
    let ID = req.body.image_id;
    console.log(ID);
    await deletePicture(ID);
    let query = `SELECT * FROM images;`;
    db.any(query)
        .then((art) => {
            res.render("pages/pictures", {
                art,
            });
        })
        .catch((error) => {
            res.render("pages/pictures", {
                message: `Pictures Failed to Load`,
            });
        });
});

async function deletePicture(ID) {
    let query = `DELETE FROM images WHERE imageID='${ID}';`;
    await db
        .any(query)
        .then(async () => {
            return console.log("Successfully Deleted Picture");
        })
        .catch((err) => {
            return console.log(err);
        });
}

app.get("/users", (req, res) => {
    let query = `SELECT * FROM users WHERE username !='admin';`;
    db.any(query)
        .then((people) => {
            res.render("pages/users", {
                people,
            });
        })
        .catch((error) => {
            res.render("pages/users", {
                message: `Users Failed to Load`,
            });
        });
});

app.get("/users/delete", async (req, res) => {
    let query = `SELECT * FROM users WHERE username !='admin';`;
    db.any(query)
        .then((people) => {
            res.render("pages/users", {
                people,
            });
        })
        .catch((error) => {
            res.render("pages/users", {
                message: `Users Failed to Load`,
            });
        });
});

app.post("/users/delete", async (req, res) => {
    let username = req.body.user_username; // this line was req.body.username before, which was getting "undefined"
    console.log(username);
    await deleteUser(username);
    let query = `SELECT * FROM users WHERE username !='admin';`;
    db.any(query)
        .then((people) => {
            res.render("pages/users", {
                people,
            });
        })
        .catch((err) => {
            res.render("pages/users", {
                message: `Users Failed to Load`,
            });
        });
});

async function deleteUser(username) {
    let query = `DELETE FROM users WHERE username='${username}';`;
    await db
        .any(query)
        .then(async () => {
            return console.log("Successfully Deleted User");
        })
        .catch((err) => {
            return console.log(err);
        });
}

app.get("/game", (req, res) => {
    let search = `SELECT * FROM images;`;
    db.any(search)
        .then((images) => {
            const count = images.length;
            const number = Math.floor(Math.random() * count);
            let query = `SELECT * FROM images WHERE images.imageID = '${number}';`;
            let score = req.session.user.score;
            db.any(query)
                .then((art) => {
                    res.render("pages/game", {
                        art,
                        score,
                    });
                })
                .catch((error) => {
                    res.render("pages/game", {
                        message: `Game Failed to Load`,
                    });
                });
        })
        .catch((error) => {
            res.render("pages/game", {
                message: `Game Failed to Load`,
            });
        });
});

app.get('/endGame', async (req, res) => {
    // Grab the local variables
    let username = req.session.user.username;
    let currentScore = req.session.user.score;

    console.log("before");

    // Update the database
    await updateScore(username, currentScore);

    console.log("after");
    // Reset score to zero
    req.session.user.score = 0;

    // Render the lost page
    res.render('pages/lost', {
        message: `You lost with a score of '${currentScore}'`,
    });
});

async function updateScore(username, currentScore) {
    // Grab the user's high score from the database
    console.log("inside update score", username);
    let search = `SELECT * FROM users WHERE username = '${username}';`;
    await db.any(search)
        .then(async (user) => {
            // console.log("user", user, user[0].highscore)
            // Check if high score is less than current score
            console.log(user[0]);
            let previousHighscore = user[0].highscore;
            let totalSeenImages = user[0].totalimages + currentScore + 1;
            // console.log(user[0].totalimages,currentScore,totalSeenImages);
            if (previousHighscore < currentScore) {
                // Update user's high score
                let query = 'UPDATE users set highscore = $2 where username = $1;';
                // let query = 'UPDATE users set highscore = $2 where username = $1, set totalImages = $3 where username = $1;';
                console.log(query, username, currentScore)
                await db.any(query, [username, currentScore])
                    // await db.any(query, [username, currentScore, totalSeenImages])
                    .then(async (data) => {
                        console.log("data: ", data);
                        // await res.status(201).json({
                        //     status: 'success',
                        //     data: data,
                        //     message: 'data updated successfully'
                        // });
                    })
                    .catch(function (err) {
                        return console.log(err);
                    });
            }
            // Update user's total seen images
            let query2 = 'UPDATE users set totalImages = $2 where username = $1;';
            await db.any(query2, [username, totalSeenImages])
                .then(async (data2) => {
                    console.log("data:", data2);
                    // await res.status(201).json({
                    //     status: 'success',
                    //     data: data2,
                    //     message: 'data updated successfully'
                    // });
                })
                .catch(function (err) {
                    return console.log(err);
                });
        })
        .catch((error) => {
            return console.log(error);
        });
}

app.get("/updateScore/:imageType/:userGuess", (req, res) => {
    imageType = req.params.imageType;
    userGuess = req.params.userGuess;
    console.log(imageType);
    if (imageType == userGuess) {
        req.session.user.score += 1;
        res.redirect("/game");
    } else {
        res.redirect("/endGame");
    }
});

app.get("/home", (req, res) => {
    let username = req.session.user.username;
    res.render("pages/home", {
        username,
    });
});

app.get("/leaderboard", (req, res) => {
    res.render("pages/leaderboard");
});

/*
app.get('/stats', (req, res) => {
    res.render('pages/stats');
});
*/

app.get("/stats", (req, res) => {
    const username = req.session.user.username;
    console.log(username);
    let query = `SELECT * FROM users WHERE users.username = '${username}';`;

    db.any(query)
        .then((user) => {
            console.log(user);
            const userData = {
                username: user[0].username,
                highscore: user[0].highscore,
                totalImages: user[0].totalimages,
            };
            console.log(userData);
            res.render("pages/stats", {
                data: userData,
            });
        })
        .catch((error) => {
            console.log("query not working");
            res.render("pages/stats", {
                data: "",
                error: error,
                message: `Error!`,
            });
        });
});

app.get("/home", (req, res) => {
    let username = req.session.user.username;
    res.render("pages/home", {
        username,
    });
});

app.get("/leaderboard", (req, res) => {
    res.render("pages/leaderboard");
});

/*
app.get('/stats', (req, res) => {
    res.render('pages/stats');
});
*/

app.get("/stats", (req, res) => {
    const username = req.session.user.username;
    console.log(username);
    let query = `SELECT * FROM users WHERE users.username = '${username}';`;

    db.any(query)
        .then((user) => {
            console.log(user);
            const userData = {
                username: user[0].username,
                highscore: user[0].highscore,
                totalImages: user[0].totalimages,
            };
            console.log(userData);
            res.render("pages/stats", {
                data: userData,
            });
        })
        .catch((error) => {
            console.log("query not working");
            res.render("pages/stats", {
                data: "",
                error: error,
                message: `Error!`,
            });
        });
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.render("pages/login", {
        message: `Successfully Logged Out`,
    });
});
