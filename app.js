var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require("passport");
var methodOverride = require('method-override');
var expressSanitizer = require("express-sanitizer");
var fileUpload = require('express-fileupload');
var User = require("./models/user");
var LocalStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose")


mongoose.connect("mongodb://anup:dolly23@ds155164.mlab.com:55164/hackrush");
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressSanitizer());
app.use(methodOverride("_method"));
app.use(fileUpload());
app.use(express.static(__dirname + "/public"));
app.use(require("express-session")({
    secret: "Rusty is the best and cutest dog in the world",
    resave: false,
    saveUninitialized: false
}));


app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


var CourseSchema = new mongoose.Schema({
    title: String,
    description: String,
    quizes: [{
        name: String,
        link: String
    }],
    notes: [{
        name: String,
        link: String
    }],
    books: [{
        name: String,
        link: String
    }],
    assignments: [{
        name: String,
        link: String
    }],
    professors: [String],
    comments: [String]
});

var course = mongoose.model("Course", CourseSchema);


course.create({
    title: 'CH 201',
    description: 'General Chemistry. This Course Taughts us basic concept of Chemistry Which are necessary for understanding chemical compounds and organic chemistry',
    quizes: [],
    notes: [],
    books: [],
    assignments: [],
    professors: ['Umashankar Singh', 'Arnab Dutta'],
    comments: []
});

/////////////////////////////


//============
// ROUTES
//============
app.post('/upload/:item/:id', function(req, res) {
    item = req.params.item;
    console.log(item);
    name = req.body.name;
    courseId = req.params.id;
    let sampleFile;
    let uploadPath;

    if (Object.keys(req.files).length == 0) {
        res.status(400).send('No files were uploaded.');
        return;
    }

    console.log('req.files >>>', req.files); // eslint-disable-line

    sampleFile = req.files.sampleFile;

    uploadPath = __dirname + '/uploads/' + sampleFile.name;

    sampleFile.mv(uploadPath, function(err) {
        if (err) {
            return res.status(500).send(err);
        }
        course.findById(courseId, function(err, foundCourse) {
            if (err) {
                console.log(err);
            } else {
                var newitem = {
                    name: name,
                    link: sampleFile.name
                };
                foundCourse[item].push(newitem);
                foundCourse.save();
                console.log(foundCourse);
                res.render("new" + item + ".ejs", { id: courseId, course: foundCourse });
            }
        });
    });
});


//comments_add

app.post('/comments/:id', function(req, res) {
    var username = req.session.passport.user;
    var comment = req.body.comment;
    var courseId = req.params.id;
    course.findById(courseId, function(err, foundCourse) {
        if (err) {
            console.log(err);
        } else {
            console.log(foundCourse);
            foundCourse.comments.push(comment + '   --by ' + username);
            foundCourse.save();
            console.log(foundCourse);
            res.render("show", { id: courseId, course: foundCourse });
        }
    });
});

//download route
app.get('/download/:link(*)', function(req, res) {
    console.log(req.params.link);
    var file = __dirname + '/uploads/' + req.params.link;
    res.download(file); // Set disposition and send it.
});

//////////////////////////////////
//Get Route


app.get('/', function(req, res) {
    res.render('home');
});

app.get('/search', isLoggedIn, function(req, res) {
    res.render('demo');
});


//New Create Routes
app.get('/courses/newquizes/:id', isLoggedIn, function(req, res) {
    courseId = req.params.id;
    course.findById(courseId, function(err, foundCourse) {
        if (err) {
            console.log(err);
        } else {
            res.render("newquizes", { id: courseId, course: foundCourse });
        }
    });
});

app.post('/result', function(req, res) {
    console.log(req.body);
    var code = req.body.name.substring(0, 6);
    console.log(code);
    course.findOne({ title: code }, function(err, foundCourse) {
        if (err) {
            console.log(err);
        } else {
            console.log(foundCourse);
            if (foundCourse != null) {
                res.render("show", { course: foundCourse });
            } else {
                res.send('Course not found');
            }

        }
    });
    // course.find();
});

app.get('/courses/newnotes/:id', isLoggedIn, function(req, res) {
    courseId = req.params.id;
    course.findById(courseId, function(err, foundCourse) {
        if (err) {
            console.log(err);
        } else {
            res.render("newnotes", { id: courseId, course: foundCourse });
        }
    });
});

app.get('/courses/newassignments/:id', isLoggedIn, function(req, res) {
    courseId = req.params.id;
    course.findById(courseId, function(err, foundCourse) {
        if (err) {
            console.log(err);
        } else {
            res.render("newassignments", { id: courseId, course: foundCourse });
        }
    });
});

app.get('/courses/newbooks/:id', isLoggedIn, function(req, res) {
    courseId = req.params.id;
    course.findById(courseId, function(err, foundCourse) {
        if (err) {
            console.log(err);
        } else {
            res.render("newbooks", { id: courseId, course: foundCourse });
        }
    });
});


// Auth Routes

//show sign up form
app.get("/register", function(req, res) {
    res.render("register");
});

//handling user sign up
app.post("/register", function(req, res) {
    if (req.body.password == req.body.c_password) {
        User.register(new User({ username: req.body.username }), req.body.password, function(err, user) {
            if (err) {
                console.log(err);
                return res.render('register');
            }
            passport.authenticate("local")(req, res, function() {
                res.redirect("/login");
            });
        });
    } else {
        res.send('Password dosent Match');
    }
});

// LOGIN ROUTES
//render login form
app.get("/login", function(req, res) {
    res.render("login");
});

//login logic
//middleware
app.post("/login", passport.authenticate("local", {
    successRedirect: "/courses",
    failureRedirect: "/login"
}), function(req, res) {
    username = req.body.username;
    console.log(username);
});

app.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/");
});


function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/login");
}

//Get Route
app.get('/courses', isLoggedIn, function(req, res) {
    console.log(req.session.passport.user);
    course.find({}, function(err, allcourses) {
        if (err) {
            console.log(err);
        } else {
            // console.log(allcourses);
            res.render("courses", { courses: allcourses });
        }
    });
});

app.get('/courses/:id', isLoggedIn, function(req, res) {
    console.log(req.params.id);
    course.findById(req.params.id, function(err, foundCourse) {
        if (err) {
            console.log(err);
        } else {
            // console.log(course);
            res.render('show', { course: foundCourse });
        }
    });
});

//listen
app.listen(8000, function() {
    console.log('Server has Started');
});