CREATE TABLE users(
username VARCHAR(50) PRIMARY KEY,
password CHAR(60) NOT NULL,
highscore INT NULL,
totalImages INT NULL
);

CREATE TABLE images(
imageID SERIAL PRIMARY KEY,
imageURL VARCHAR(1024) NOT NULL,
imageType VARCHAR(4) NOT NULL,
imageDescription VARCHAR(256)
);