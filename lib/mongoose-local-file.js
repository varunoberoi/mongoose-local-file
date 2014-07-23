var async = require('async'),
    _ = require('lodash'),
    guid = require('./guid'),
    mongoose,
    mkdirp = require('mkdirp'),
    path = require('path'),
    fs = require('fs');

/* 
    Helpers
*/
var matchLocalFile = function(type) {
    return mongoose.SchemaTypes.LocalFile === type || mongoose.SchemaTypes.LocalFile === type.type;
};

var matchArrayOfLocalFile = function(type) {
    if (_.isArray(type)) {
        return matchLocalFile(type[0]);
    }
    return false;
};

var matchArrayOfObject = function(type) {
    if (_.isArray(type))
        if (_.isObject(type[0]))
            if (!_.has(type[0], 'type'))
                return (typeof type[0] === 'object')
    return false;
};

var matchObject = function(type) {
    if (_.isObject(type) && !_.isArray(type))
        if (!_.has(type, 'type'))
            return (typeof type === 'object')
    return false;
};


var checkIfUrlOrB64 = function(value) {
    if (!value)
        return false;
    return !(/^data:([A-Za-z-+\/]+);base64,(.+)$/i.test(value));
};

function decodeBase64Image(dataString) {
    var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
        response = {};

    if (matches.length !== 3) {
        return new Error('Invalid input string');
    }

    response.type = matches[1];
    response.data = new Buffer(matches[2], 'base64');

    return response;
}

// Saves file to disk returns partial url via callback
var saveToDisk = function(fileOptions, cb) {

    if (!fileOptions.name)
        fileOptions.name = '';

    if (!fileOptions.directory)
        return cb("No directory path specified neither in field nor via plugin");

    var buf = decodeBase64Image(fileOptions.file).data;
    mkdirp(path.resolve(fileOptions.directory), function(err) {
        if (err)
            return cb(err);
        fs.writeFile(path.resolve(fileOptions.directory + '/' + fileOptions.name), buf, function(err) {
            if (err)
                return cb(err);
            cb(null, fileOptions.name);
        });
    });
};

var extractOptions = function(schema) {
    if (schema.type) {
        return _.pick(schema, ['directory', 'name']);
    }
    return {};
};

// Plugin
exports.plugin = function(schema, options) {

    schema.pre('save', function(next) {
        var doc = this;
        recurr(schema.tree, doc.toObject(), function(err, newDoc) {
            _.extend(doc, newDoc);
            next(err);
        });
    });

    // Recursive walks schema & document & tries to upload all possible LocalFile fields
    var recurr = function(schema, document, cb) {
        async.mapSeries(_.keys(document), function(key, cb) {
            if (schema[key]) {
                if (matchLocalFile(schema[key])) {

                    if (checkIfUrlOrB64(document[key]))
                        return cb(null, document[key]);

                    var schemaOptions = extractOptions(schema[key]),
                        fileOptions = {
                            name: (schemaOptions.name ? schemaOptions.name.call(document) : guid()),
                            file: document[key]
                        };

                    saveToDisk(_.extend(options, schemaOptions, fileOptions), function(err, url) {
                        cb(err, [key, url]);
                    });
                } else if (matchArrayOfLocalFile(schema[key])) {
                    var schemaOptions = extractOptions(schema[key][0]);
                    async.mapSeries(document[key], function(item, cb) {
                        if (checkIfUrlOrB64(item))
                            return cb(null, item);

                        var fileOptions = {
                            name: schemaOptions.name ? schemaOptions.name.call(item) : guid(),
                            file: item
                        };
                        saveToDisk(_.extend(options, schemaOptions, fileOptions), cb);
                    }, function(err, urls) {
                        cb(err, [key, urls]);
                    });
                } else if (matchArrayOfObject(schema[key])) {
                    async.mapSeries(document[key], function(item, cb) {
                        recurr(schema[key][0], item, cb);
                    }, function(err, arr) {
                        if (err)
                            return cb(err);
                        cb(null, [key, arr]);
                    });
                } else if (matchObject(schema[key])) {
                    recurr(schema[key], document[key], function(err, doc) {
                        if (err)
                            return cb(err);
                        cb(null, [key, doc]);
                    });
                } else {
                    cb(null, [key, document[key]]);
                }
            } else {
                cb(null, [key, document[key]]);
            }
        }, function(err, arr) {
            if (err)
                return cb(err);
            cb(null, _.object(arr));
        });
    };

};

function LocalFile(path, options) {
    mongoose.SchemaTypes.String.call(this, path, options);
}

// Loads LocalFile type
exports.loadType = function(mongooseObject) {
    mongoose = mongooseObject;
    var SchemaTypes = mongoose.SchemaTypes;

    LocalFile.prototype.__proto__ = SchemaTypes.String.prototype;
    SchemaTypes.LocalFile = LocalFile;
    mongoose.Types.LocalFile = String;
};