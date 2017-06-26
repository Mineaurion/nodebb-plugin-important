"use strict";

var plugin = {},
	async = module.parent.require('async'),
	topics = module.parent.require('./topics'),
	posts = module.parent.require('./posts'),
	categories = module.parent.require('./categories'),
	meta = module.parent.require('./meta'),
	privileges = module.parent.require('./privileges'),
	rewards = module.parent.require('./rewards'),
	user = module.parent.require('./user'),
	helpers = module.parent.require('./controllers/helpers'),
	db = module.parent.require('./database'),
	SocketPlugins = module.parent.require('./socket.io/plugins'),
	pagination = module.parent.require('./pagination');

plugin.init = function(params, callback) {
	var app = params.router,
		middleware = params.middleware,
		controllers = params.controllers;

	app.get('/admin/plugins/important', middleware.admin.buildHeader, renderAdmin);
	app.get('/api/admin/plugins/important', renderAdmin);

	app.get('/important', middleware.buildHeader, renderImportant);
	app.get('/api/important', renderImportant);

	handleSocketIO();

	callback();
};

plugin.appendConfig = function(config, callback) {
	meta.settings.get('important', function(err, settings) {
		config['important'] = settings;
		callback(null, config);
	});
};

plugin.addNavigation = function(menu, callback) {
	menu = menu.concat(
		[
			{
				"route": "/important",
				"title": "Important",
				"iconClass": "fa-exclamation-circle",
				"text": "Important"
			}
		]
	);

	callback (null, menu);
};

plugin.addAdminNavigation = function(header, callback) {
	header.plugins.push({
		route: '/plugins/important',
		icon: 'fa-exclamation-circle',
		name: 'Important'
	});

	callback(null, header);
};

plugin.getTopics = function(data, callback) {
	var topics = data.topics;

	async.map(topics, function(topic, next) {
		if (parseInt(topic.isImportant, 10)) {
			if (parseInt(topic.isImportant, 10)) {
				topic.title = '<span class="important"><i class="fa fa-exclamation-circle"></i> Important</span> ' + topic.title;
			}
		}
		
		return next(null, topic);
	}, function(err, topics) {
		return callback(err, data);
	});
};

plugin.addThreadTool = function(data, callback) {

    var isImportant = parseInt(data.topic.isImportant, 10);

    if (parseInt(data.topic.isImportant, 10)) {
        data.tools = data.tools.concat([
            {
                class: 'toggleImportantStatus',
                title: 'Remove Important status',
                icon: 'fa-exclamation-circle'
            }
        ]);
	} else {
		data.tools.push({
			class: 'toggleImportantStatus alert-danger',
			title: 'Mark as important',
			icon: 'fa-exclamation-circle'
		});
	}
	callback(false, data);
};

function renderAdmin(req, res, next) {
	async.waterfall([
		async.apply(db.getSortedSetRange, 'categories:cid', 0, -1),
		function(cids, next) {
			categories.getCategoriesFields(cids, ['cid', 'name'], next);
		}
	], function(err, data) {
		res.render('admin/plugins/important', {
			categories: data
		});
	});
}

function handleSocketIO() {
	SocketPlugins.Important = {};

	SocketPlugins.Important.toggleImportantStatus = function(socket, data, callback) {
		privileges.topics.isAdminOrMod(data.tid, socket.uid, function(err, isAdminOrMod) {
			if (!isAdminOrMod) {
				return callback(new Error('[[error:no-privileges]]'));
			}
			toggleImportantStatus(data.tid, callback);
		});
	};
}

function toggleImportantStatus(tid, callback) {
	topics.getTopicField(tid, 'isImportant', function(err, isImportant) {
        isImportant = parseInt(isImportant, 10) === 1;

		async.parallel([
            function(next) {
                topics.setTopicField(tid, 'isImportant', isImportant ? 0 : 1, next);
            },
            function(next) {
                if (!isImportant) {
					db.sortedSetAdd('topics:important', Date.now(), tid, next);
                } else {
					db.sortedSetRemove('topics:important', tid, next);
                }
            }
		], function(err) {
			callback(err, {isImportant: !isImportant});
		});
	});	
}

function renderImportant(req, res, next) {
	var page = parseInt(req.query.page, 10) || 1;
	var pageCount = 1;
	var stop = 0;
	var topicCount = 0;
	var settings;
	
	async.waterfall([
		function (next) {
			async.parallel({
				settings: function(next) {
					user.getSettings(req.uid, next);
				},
				tids: function (next) {
					db.getSortedSetRevRange('topics:important', 0, 199, next);
				}
			}, next);
		},
		function (results, next) {
			settings = results.settings;
			privileges.topics.filterTids('read', results.tids, req.uid, next);
		},
		function (tids, next) {
			var start = Math.max(0, (page - 1) * settings.topicsPerPage);
			stop = start + settings.topicsPerPage - 1;

			topicCount = tids.length;
			pageCount = Math.max(1, Math.ceil(topicCount / settings.topicsPerPage));
			tids = tids.slice(start, stop + 1);

			topics.getTopicsByTids(tids, req.uid, next);
		}
	], function(err, topics) {
		if (err) {
			return next(err);
		}
		
		var data = {};
		data.topics = topics;
		data.nextStart = stop + 1;
		data.set = 'topics:important';
		data['feeds:disableRSS'] = true;
		data.pagination = pagination.create(page, pageCount);
		if (req.path.startsWith('/api/important') || req.path.startsWith('/important')) {
			data.breadcrumbs = helpers.buildBreadcrumbs([{text: 'Important'}]);
		}
		
		res.render('recent', data);
	});
}
module.exports = plugin;
