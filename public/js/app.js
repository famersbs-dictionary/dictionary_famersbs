
jQuery(function ($) {
	'use strict';

	Handlebars.registerHelper('eq', function(a, b, options) {
		return a === b ? options.fn(this) : options.inverse(this);
	});

	var ENTER_KEY = 13;
	var ESCAPE_KEY = 27;

	var util = {
		uuid: function () {
			/*jshint bitwise:false */
			var i, random;
			var uuid = '';

			for (i = 0; i < 32; i++) {
				random = Math.random() * 16 | 0;
				if (i === 8 || i === 12 || i === 16 || i === 20) {
					uuid += '-';
				}
				uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
			}

			return uuid;
		},
		pluralize: function (count, word) {
			return count === 1 ? word : word + 's';
		},
		store: function (namespace, data) {
			if (arguments.length > 1) {
				return localStorage.setItem(namespace, JSON.stringify(data));
			} else {
				var store = localStorage.getItem(namespace);
				return (store && JSON.parse(store)) || [];
			}
		}
	};

	var App = {

		init: function () {
			this.todos = util.store('todos-jquery');
			this.cacheElements();
			this.bindEvents();
			this.filterstr = "";
			this.sortfield = "";
			this.syncer = Syncer();

			Router({
				'/:sortfield': function (sortfield) {
					this.sortfield = sortfield;
					this.render();
				}.bind(this)
			}).init('/date');
		},

		cacheElements: function () {
			this.headerMenuTemplate = Handlebars.compile($('#header-menu-template').html() );
			this.todoTemplate = Handlebars.compile($('#word-template').html());

			this.$todoApp = $('#todoapp');
			this.$header = this.$todoApp.find('#header');
			this.$headerMenu = this.$todoApp.find('#header-menu');
			this.$addBox = this.$todoApp.find('#addBox');
			this.$main = this.$todoApp.find('#main');
			this.$footer = this.$todoApp.find('#footer');
			this.$newTodo = this.$addBox.find('#new-todo');
			this.$toggleAll = this.$main.find('#toggle-all');
			this.$todoList = this.$main.find('#todo-list');
			this.$count = this.$footer.find('#todo-count');
			this.$clearBtn = this.$footer.find('#clear-completed');
		},
		bindEvents: function () {
			var list = this.$todoList;
			this.$newTodo.on('keyup', this.create.bind(this));
			this.$toggleAll.on('change', this.toggleAll.bind(this));
			this.$footer.on('click', '#clear-completed', this.destroyCompleted.bind(this));
			
			list.on('change', '.toggle', this.toggle.bind(this));
			list.on('dblclick', 'label', this.edit.bind(this));
			list.on('keyup', '.edit', this.editKeyup.bind(this));
			list.on('focusout', '.edit', this.update.bind(this));
			list.on('click', '.destroy', this.destroy.bind(this));
		},
		render: function () {

			var todos = this.getFilteredTodos();

			this.renderHeaderMenu();
				// this point is move to bindEvents
			this.$syncBtn = this.$headerMenu.find('#sync-btn');
			this.$syncBtn.on('click', this.syncAll.bind(this) );
			this.$todoList.html(this.todoTemplate(todos));
			this.$newTodo.focus();
			util.store('todos-jquery', this.todos);
		},
		renderHeaderMenu: function(){
			
			var todoCount = this.todos.length;
			var unsyncCount = this.getUnsyncCount();

			var template = this.headerMenuTemplate({
				unsyncCount: unsyncCount,
				todoCount: todoCount,
				enableSyncBtn: ( unsyncCount > 0 ), 
				sortfield: this.sortfield
			});

			this.$headerMenu.toggle(todoCount > 0).html(template);

		},
		toggleAll: function (e) {
			var isChecked = $(e.target).prop('checked');

			this.todos.forEach(function (todo) {
				todo.completed = isChecked;
			});

			this.render();
		},

		foreachWords: function( cb ) {
			// cb -> function( word, descript )

			var ret = 0;
			for( var i = 0 ; i < this.todos.length ; ++ i )
			{
				for( var j = 0 ; j < this.todos[i].descript.length ; ++ j ){
					cb( this.todos[i], this.todos[i].descript[j] );
					//if( !this.todos[i].descript[j].sync ) ret = ret + 1;
				}
			}

		},

		getUnsyncCount: function() {
			var ret = 0;
			this.foreachWords( function ( word, descript ) {
				if( !descript.sync ) ret = ret + 1;
			} );
			return ret;
		},
		
		getUnsyncItems: function(){

			var ret = new Array();

			this.foreachWords( function ( word, descript ) {
				if( !descript.sync ){
					
					ret.push( {word:word.word, desc:descript.desc} );
				} 

			} );

			return ret;
		},

		getFilteredTodos: function () {
			var filterstr = this.filterstr;
			var ret = null;
			if( "" == filterstr ){
				ret = this.todos.filter( function(word){return true;} );
			}else{
				ret = this.todos.filter( function( word ) {
					return 0 <= word.word.indexOf( filterstr );
				});
			}

			return ret.sort()

		},
		destroyCompleted: function () {
			this.todos = this.getActiveTodos();
			this.filter = 'all';
			this.render();
		},
		// accepts an element from inside the `.item` div and
		// returns the corresponding index in the `todos` array
		indexFromEl: function (el) {
			var id = $(el).closest('li').data('id');
			var todos = this.todos;
			var i = todos.length;

			while (i--) {
				if (todos[i].id === id) {
					return i;
				}
			}
		},
		create: function (e) {
			var $input = $(e.target);
			var val = $input.val().trim();
			var idx_sprator = val.indexOf(".");


			if (e.which !== ENTER_KEY || !val) {
				// change filter
				if( idx_sprator < 0 ){
					this.filterstr = val;
					this.render();
				}

				return;
			}

			// parse string
			
			var word = val.substring( 0, idx_sprator );
			var descript = val.substring( idx_sprator + 1 );

			// find same word
			var isfinded = false;
			for( var i = 0 ; i < this.todos.length ; ++ i ){
				if( this.todos[i].word == word ) {
					this.todos[i].descript.push( { desc:descript, sync:false } );
					this.todos[i].lastupdate = new Date();
					isfinded = true;
					break;
				}
			}

			// didn't find the word is new
			if( !isfinded ){
				this.todos.push({
					id: util.uuid(),
					title: val,
					word: word,
					descript: [ { desc:descript, sync:false } ],
					lastupdate: new Date(),
					completed: false
				});
			}

			$input.val('');
			this.filterstr = '';

			this.render();
		},
		toggle: function (e) {
			var i = this.indexFromEl(e.target);
			this.todos[i].completed = !this.todos[i].completed;
			this.render();
		},
		edit: function (e) {
			var $input = $(e.target).closest('li').addClass('editing').find('.edit');
			$input.val($input.val()).focus();
		},
		editKeyup: function (e) {
			if (e.which === ENTER_KEY) {
				e.target.blur();
			}

			if (e.which === ESCAPE_KEY) {
				$(e.target).data('abort', true).blur();
			}
		},
		update: function (e) {
			var el = e.target;
			var $el = $(el);
			var val = $el.val().trim();

			if ($el.data('abort')) {
				$el.data('abort', false);
				this.render();
				return;
			}

			var i = this.indexFromEl(el);

			if (val) {
				this.todos[i].title = val;
			} else {
				this.todos.splice(i, 1);
			}

			this.render();
		},
		destroy: function (e) {
			this.todos.splice(this.indexFromEl(e.target), 1);
			this.render();
		},

		syncAll: function(e) {
			// Step 1. request unsync to sync
			var unsyncs = this.getUnsyncItems();

			for( var i = 0 ; i < unsyncs.length ; ++ i ){

				var job = {};
				job.type = this.syncer.JOB_TYPE_GET_REQ;
				job.data = { url: "/push/" + encodeURI( unsyncs[i].word ) + "/" + encodeURI( unsyncs[i].desc ) };

				this.syncer.addJob( job );	
			}

			// Step 2. select all words
			var step_2_job = {};
			var parent_this = this;
			step_2_job.type = this.syncer.JOB_TYPE_CALL_FUNC;
			step_2_job.func = function(){

				console.log("trying sync All");
				$.ajax({
						type: "GET",
						url: "/pull",
						success : function(data){

							console.log( JSON.stringify(data) );

							parent_this.todos = data;
							parent_this.render();
							
							console.log("Complete~~! Sync !!!");
						}
					});

				
			};
			this.syncer.addJob( step_2_job );

			// Step 3. render
			this.render();
		}
	};

	// Sync job runner
	var Syncer = function(){

		var that = {};

			// pre define
		that.JOB_TYPE_GET_REQ = 0;
		that.JOB_TYPE_CALL_FUNC = 1;

		var jobs = new Array();
		var current_job = null;

		var completedCurrentJob = function(){
			current_job = null;
			runNextJob();
		};

		var runNextJob = function(){
			if( null == current_job && jobs.length > 0 ){

				current_job = jobs.shift();

				switch( current_job.type ){
					case that.JOB_TYPE_GET_REQ:
					console.log( current_job.data.url );
					$.ajax({
						type: "GET",
						url: current_job.data.url,
						success : function(data){
							completedCurrentJob();
						}
					});
					break;

					case that.JOB_TYPE_CALL_FUNC:

					current_job.func();
					completedCurrentJob();

					break;

					default:
					console.log( "Unknown job type ", current_job );
					current_job = null;
					runNextJob();
					break;
				}
				
			}
		};

		that.addJob = function( job ){
			jobs.push( job );
			runNextJob();
		};



		return that;

	};

	App.init();

});