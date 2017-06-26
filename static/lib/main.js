"use strict";

/*global socket, config, ajaxify, app*/

$('document').ready(function() {
	$(window).on('action:ajaxify.end', function(err, data) {
		if (data.url.match(/^topic\//)) {
			addLabel();
		}
	});

	$(window).on('action:topic.tools.load', addHandlers);

	function addHandlers() {
		$('.toggleImportantStatus').on('click', toggleImportant);
	}

	function addLabel() {
		if (ajaxify.data.hasOwnProperty('isImportant') && parseInt(ajaxify.data.isImportant, 10) === 1) {
			require(['components'], function(components) {
				components.get('post/header').prepend('<span class="important"><i class="fa fa-exclamation-circle"></i> Important</span>');
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
