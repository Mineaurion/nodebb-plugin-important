"use strict";

/*global socket, config, ajaxify, app*/

$('document').ready(function() {
	$(window).on('action:ajaxify.end', function(err, data) {
		if (data.url.match(/^topic\//)) {
			addLabel();
		}
	});

	$(window).on('action:topic.tools.load', addHandlers);

	$(window).on('action:composer.loaded', function(err, data) {
		if (data.hasOwnProperty('composerData') && !data.composerData.isMain) {
			// Do nothing, as this is a reply, not a new post
			return;
		}

		var item = $('<button type="button" class="btn btn-info dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></button><ul class="dropdown-menu pull-right" role="menu"><li><a href="#" data-switch-action="post"><i class="fa fa-fw fa-exclamation"></i> Mark as Important</a></li></ul>');
		var actionBar = $('#cmp-uuid-' + data.post_uuid + ' .action-bar');

		item.on('click', 'li', function() {
			$(window).off('action:composer.topics.post').one('action:composer.topics.post', function(ev, data) {
				callToggleImportant(data.data.tid,false);
			});
		});

		if (
			config['important'].forceQuestions === 'on' ||
			(config['important']['defaultCid_' + data.composerData.cid] === 'on')
		) {
			$('.composer-submit').attr('data-action', 'post').html('<i class="fa fa-fw fa-exclamation"></i> Mark as Important</a>');
			$(window).off('action:composer.topics.post').one('action:composer.topics.post', function(ev, data) {
				callToggleImportant(data.data.tid, false);
			});
		} else {
			actionBar.append(item);
		}
	});

	function addHandlers() {
		$('.toggleImportant').on('click', toggleImportant);
	}

	function addLabel() {
		if (ajaxify.data.hasOwnProperty('isImportant') && parseInt(ajaxify.data.isImportant, 10) === 1) {
			require(['components'], function(components) {
				components.get('post/header').prepend('<span class="important"><i class="fa fa-exclamation"></i> Important</span>');
			});
		}
	}

	function toggleImportant() {
		var tid = ajaxify.data.tid;
		callToggleImportant(tid, true);
	}

	function callToggleImportant(tid, refresh) {
		socket.emit('plugins.Important.toggleImportantStatus', {tid: tid}, function(err, data) {
			app.alertSuccess(data.isImportant ? 'Topic has been marked as important' : 'Topic is now a regular thread');
			if (refresh) {
				ajaxify.refresh();
			}
		});
	}
});
