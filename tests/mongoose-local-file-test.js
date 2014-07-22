'use strict';

/**
 * Module dependencies.
 */
var chai = require('chai'),
    should = chai.should(),
    mongoose = require('mongoose'),
    LocalFileUploader = require('../index'),
    fs = require('fs'),
    path = require('path'),
    Schema = mongoose.Schema;

// Loading type
LocalFileUploader.loadType(mongoose);

// Connecting to database
var db = mongoose.connect('mongodb://localhost/LocalFileUploaderTest');

// Creating a schema
var UserSchema = new Schema({
    name: String,
    photo: {
        type: mongoose.SchemaTypes.LocalFile
    }
});

// Applying plugin to schema
UserSchema.plugin(LocalFileUploader.plugin, {
    directory: __dirname + '/public/'
});

// Registering model
var User = mongoose.model('User', UserSchema);

describe('LocalFileUploader', function() {

    it("Should able to create new instance with a file type", function(done) {
        new User({
            name: 'user 1',
            photo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIgAAAAXCAYAAADQigfEAAAFCklEQVRoQ+2agXETMRBF4wqACjgqACrAqYB0gKmAUEGcCkgq4KiAUAFOBYQKcCogqSD8p9HeyEK60935PM7EmtHEvlutVrtff1dyZkcD28PDw1xDF+r8fRmoudfnlfrVbDarB6o/DNsTD8z62iFgPCf46u8Kxv4GRALKTYHsQWQPPdALIALHG88Oz3qsBUY5PbBJD4/tkWgxQDxzwARhOumzlGOBhNRzaI/IA0mA+PriROswxqCWWKp/GLG2W/QJJHcjdLQO9XavNcc6FvTveHw3JuVJTyUd1a7Avuv5Yr/9BxAZRH3xfqIgfpZjLybSfSTbH6T7XHMAZtf0iM+n6mFaBKykPdYayp212OYY0Os702fnO/ueGHetZxTqG+sdKm/zpexr0Wni1xo/H+L3DYAUTDRkjnDMrQytxirJjY8BEoCjqYF8HVVLx2v1Ju0Faz/O6L+B/VoAEo+DgRfqa/W5MWfLPK3yhQDJ2T6YNWOAQP99CtAhsX4xVZpJAIT11JoPBmmar6f+6sE3vSOIDRO0BSIlFwMmmocU/Uv90mzYprzN1aZzSIDCMQ1A/M5iMVO3yYrVBEBIOU1wouA5YNjpqtTJOQbJAUvytaY50XuuBzqB2Fe+ROeYgIYAqaTozxhlhWN3CZCVbOK+5ps6TML3ZJsQIADxq/pbiuOuefS+l/xOAOIpl2Iqd0qhqOO9XXhZvrR0REEGja/VoVUaf3kWH4u5F1lOUawmGCR1qYetAAXAYK9rQW3A+7ghW6eCURDwucb9VE8WufFE0tdLvsB2RKjBBl1WWiXednJp8nS4GA8qu1El6Bz9No6wHcBLUn8iOMWPYoAEwa/0GcfTAS4FKu1jHHg9O09MuDL2GZBiegV8JEBStrOcjc2Qcqif12q1lY/n6SygtNS45tQhOVjDFIQ7CmVG4+xYl2vVLuTUKw+Stb6nit+tppscQOKFSa7SM8ANUFzR3MUEpmMAQBYaS4p5BWN1zRPEo0geu7p0pgIbPvP+II5zdTY5nzn5zAEI1GM7KtZ1LqGlVxDXJ45ZPABQGOu4DwqzWu9T6euHZABer5ZzSAiQeCcmQMK839WLqH8EQPAN7FqVBFN295Iv0dnlXM3JxsdGRwBGBgYQKv1cM4DMJUAejZu7+PIAAmgxS2zsgtQkGl983R8HSd+bI7MHKkdXsxkm2zjKhvMHO7WoeBwCkGAOZ1NXMPvK52zqAkT83m84TnRmI/GmTnQM0gaQZodLLK5TKFwpQF0e13tyOzJWlDqG8U7JstRAgDAXR3JOJxRgpIhan2EpF3A/74X+flK/VCflrf1z2AN5agvHYKU0nUsxUhFeUgFO9GLPNY62oNj4kfKmjr+sCT9zCzzoosxiF7AcvoFROgGCAY6CvRMJDIsnABUOVoc1YhnQaEHCeHJwsg0BiLcFOvwSKE3+auwDgmzIbsjiBHYJOXcbAInXx2moqdXsZQCQsfI23grTtp8JNkCaCoS3C1BbDULcljDIWh/afqHNHks11nYoc2Iou9QcDpAITJvht4baHIDanvu0Amhp7io8J+93CTYB3tWQ+Z7iGACy7Ahi6JfwjgBnp4pb/kmIQJX8Q1GTm5+i8x/Dmu0eJFsjTLgIaphJf/6f0PYno9oAAhtAu7nj7rYdAjj4fcLVKYe2vx6If81dyFTqhqmAAjBq9aZW2V/XHCzDA9k7iLCo24arDoXhNry4ex3/AIgfY6K50UjyAAAAAElFTkSuQmCC'
        }).save(done);
    });

    var file;
    it("Should able to find the instance & it should have url of the file", function(done) {
        User
            .find({})
            .exec(function(err, users) {
                if (err)
                    return done(err);
                users[0].photo.should.not.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/i);
                file = users[0].photo;
                done();
            })
    });

    it("File should exists at the path", function(done) {
        fs.exists(path.resolve(__dirname + '/public/' + file), function(exists) {
            exists.should.equal(true);
            done();
        });
    });

    after(function(done) {
        // Cleaning up database
        db.connection.db.dropDatabase();
        db.connection.close();

        // Clearing public directory
        var dirPath = __dirname + '/public/';
        try {
            var files = fs.readdirSync(dirPath);
        } catch (e) {
            return;
        }
        if (files.length > 0)
            for (var i = 0; i < files.length; i++) {
                var filePath = dirPath + '/' + files[i];
                if (fs.statSync(filePath).isFile())
                    fs.unlinkSync(filePath);
            }
        done();
    });
});