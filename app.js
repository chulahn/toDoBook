var express = require('express');
var app = express();
var bodyParser = require('body-parser')


var mongo = require("mongodb");
var MongoClient = mongo.MongoClient;
var databaseURL = process.env.DBURL;

app.use(bodyParser.urlencoded({ extended: false }));

app.get('/' , function(req, res) {
	res.sendfile("home.html")
});

app.get('/add' , function(req, res) {
	var randomNum = Math.floor(Math.random() * 100000)
	var randomString = Math.random().toString(36).substring(10); 
	var randomID = randomNum + randomString;
	res.render('add.ejs', {ejs_taskID : randomID});
});

app.post('/add/:taskID', function(req, res) {
	addTask(req.params.taskID, req.body, res)
});

app.get('/delete/all', function(req, res) {
	deleteAll(res);
});

app.get('/delete/:taskID', function(req, res) {
	deleteTask(req.params.taskID, req.body, res);	
});

app.get('/update/:taskID', function(req, res) {
	var taskID = req.params.taskID;
	MongoClient.connect(databaseURL, function (err, db) {
		if (db) {

			var collect = db.collection('monday');

			collect.find({"id": taskID}).toArray(function (err, taskToUpdate) {

				if (taskToUpdate.length !== 0) {
					console.log(taskToUpdate[0])
					res.render('update.ejs', {ejs_task : taskToUpdate[0]});
				}

				else {
					return res.send("invalid task to update");
				}
			});

		}

		else {
			return res.send("failed to connect to db in update");

		}
	});
});

app.post('/update/:taskID', function(req, res) {
	updateTask(req.params.taskID, req.body, res);	
});

app.get('/complete/:taskID', function(req, res) {
	completeTask(req.params.taskID, res);
});


app.get('/alltasks', function(req, res) {

	MongoClient.connect(databaseURL, function(err, db) {
		if (db) {
			var tasks = db.collection('monday');
			tasks.find({}).toArray(function (err, allTasks) {
				if (allTasks) {
					if (allTasks.length !== 0) {
						res.render('alltasks.ejs', {ejs_allTasks: allTasks});
					}
					else {
						res.send("no tasks!  <a href=\"/add\">add some</a>")
					}
				}
				else {
					res.send("error when finding tasks");
				}
			});

		}
		else {
			console.log("failed to connect to db in tasks");
			res.redirect('/tasks');
		}
	});

});

app.get('/task/:taskID', function(req, res) {
	var taskID = req.params.taskID;
	MongoClient.connect(databaseURL, function(err, db) {
		if (db) {

			db.collection('monday').find({"id" : taskID}).toArray(function(err, results) {

				if (results.length !== 0) {
					console.log(results)
					res.render('task.ejs', {ejs_task : results[0]});
				}
				else {
					res.send("no such task")
				}
			});
		}
		else {
			res.send("error connecting while getting task");
		}
	});
});

app.get('/home.css', function(req, res) {
	res.sendfile('styles/home.css');
});

app.get('/styles/task.css', function(req, res) {
	res.sendfile('styles/task.css');
});

app.get('/styles/tasks.css', function(req, res) {
	res.sendfile('styles/alltasks.css');
});

app.get('/styles/addupdate.css', function(req, res) {
	res.sendfile('styles/addupdate.css');
});

app.get('/images/incomplete.jpg', function(req, res) {
	res.sendfile('images/incomplete.jpg');
});

app.get('/images/complete.jpg', function(req, res) {
	res.sendfile('images/complete.jpg');
});

app.get('/images/compositionbg.jpg', function(req, res) {
	res.sendfile('images/compositionbg.jpg');
});

app.get('/images/notebookbg.png', function(req, res) {
	res.sendfile('images/notebookbg.png');
});



function addTask(taskID, task, res) {
	task.id = taskID;

	function insert(collection, taskID, task) {
		collection.insert({"id" : taskID,
						"name" : task.name,
						"due" : task.due,
						"details" : task.details,
						"lastUpdated" : new Date(),
						"completed" : false}
					  ,function(err, success) {
						if (success) {
							res.render('success.ejs', {ejs_task : task, action: "added"})
						}
						else {
							res.send("unsuccessful add");
						}
					});
	}	

	MongoClient.connect(databaseURL, function(err, db) {
		if (db) {
			var collect = db.collection('monday');
			collect.find({"id" : taskID}).toArray(function (err, results) {
				if (results.length === 0) {
					insert(collect, taskID, task);
				}
				else {
					//if ID is already in.
					var randomNum = Math.floor(Math.random() * 100000)
					var randomString = Math.random().toString(36).substring(10); 
					var randomID = randomNum + randomString;
					insert(collect, randomID, task)
				}
			});
		}
	});
}

function deleteTask(taskID, task, res) {
	MongoClient.connect(databaseURL, function(err, db) {
		if (db) {
			db.collection('monday').remove({"id": taskID} , function(err, success) {
				if (success) {
					console.log(task);
					res.render('success.ejs', {ejs_task : task, action: "deleted"})
					console.log(success[0],"-----")
				}
				else {
					res.send("invalid task to delete")
				}
			});
		}
		else {
			res.send("failed to connect when deleting task");
		}
	})
}

function deleteAll(res) {
	MongoClient.connect(databaseURL, function(err, db) {
		if (db) {
			db.collection('monday').remove({} , function(err, success) {

				if (success) {
					console.log("deleted all tasks!")
					res.redirect('/tasks');
				}
				else {
					res.send("couldnt delete all tasks")
				}
			});
		}
		else {
			res.send("failed to connect when deleting all");
		}
	})
}


function updateTask(taskID, task, res, complete) {
	MongoClient.connect(databaseURL, function(err, db) {
		if (db) {
			var collect = db.collection('monday');
			collect.update({"id" : taskID}, 
							{$set : {
								"name" : task.name,
								"due" : task.due,
								"details" : task.details,
								"lastUpdated" : new Date(),
								"completed" : complete || false
								}
							}
					  ,function(err, success) {
						if (success) {
							res.render('success.ejs', {ejs_task : task, action: "updated"})
						}
						else {
							res.send("unsuccessful update");
						}
					})
		}
	});
}

function completeTask(taskID, res) {
	MongoClient.connect(databaseURL, function(err, db) {
		if (db) {
			var collect = db.collection('monday');
			collect.update({"id" : taskID}, 
							{$set : {
								"completed" : true
								}
							}
					  ,function(err, success) {
						if (success) {
							res.render('success.ejs', {ejs_task : undefined, action: "completed"})
						}
						else {
							res.send("unsuccessful update");
						}
					})
		}
	});	
}

app.listen(process.env.PORT || 3000);