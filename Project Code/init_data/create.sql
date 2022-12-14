CREATE TABLE users(
username VARCHAR(50) PRIMARY KEY,
password CHAR(60) NOT NULL,
highscore INT DEFAULT 0,
totalImages INT DEFAULT 0
);

CREATE TABLE images(
imageID SERIAL PRIMARY KEY,
imageURL VARCHAR(1024) NOT NULL,
imageType VARCHAR(4) NOT NULL,
imageDescription VARCHAR(256)
);