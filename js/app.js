(function() {

  'use strict';

  var ENTER_KEY = 13;
  var newTodoDom1 = document.getElementById('new-msg1');
  var newTodoDom2 = document.getElementById('new-msg2');
  var syncDom = document.getElementById('sync-wrapper');

  // EDITING STARTS HERE (you dont need to edit anything above this line)
  var db = new PouchDB('chat-1');
  var remoteCouch = 'http://admin:admin@127.0.0.1:5984/chat-1';

  var db2 = new PouchDB('chat-2');
  var remoteCouch2 = 'http://admin:admin@127.0.0.1:5984/chat-2';

  db.changes({
    since: 'now',
    live: true
  }).on('change', showChat1);

  db2.changes({
    since: 'now',
    live: true
  }).on('change', showChat2);

  // We have to create a new todo document and enter it in the database
  function addChat(msg, chatDb) {
    var chat = {
      _id: new Date().toISOString(),
      title: msg,
      completed: false
    };
    chatDb.put(chat, function callback(err, result) {
      if (!err) {
        console.log('Successfully posted a chat msg!');
      }
    });
  }

  // Show the current list of todos by reading them from the database
  function showChat1() {
    db.allDocs({include_docs: true, descending: true}, function(err, doc) {
      redrawChat1UI(doc.rows);
    });    
  }

  // Show the current list of todos by reading them from the database
  function showChat2() {
    db2.allDocs({include_docs: true, descending: true}, function(err, doc) {
      redrawChat2UI(doc.rows);
    });    
  }

  function checkboxChanged(msg, event) {
    msg.read = event.target.checked;
    db.put(msg);
    }

  // User pressed the delete button for a todo, delete it
  function deleteButtonPressed(msg) {
    db.remove(msg);
    }

  // The input box when editing a todo has blurred, we should save
  // the new title or delete the todo if the title is empty
  function todoBlurred(todo, event) {
    var trimmedText = event.target.value.trim();
    if (!trimmedText) {
      db.remove(todo);
    } else {
      todo.title = trimmedText;
      db.put(todo);
    }
  }

  // Initialise backup with the remote server
  function backup(remote, chatDB) {
    syncDom.setAttribute('data-sync-state', 'doing backup');
    var opts = {live: true, retry: true};
    chatDB.replicate.to(remote, opts, syncError);
//    db.replicate.from(remoteCouch, opts, syncError);
    }

  // Initialise a sync with the remote server
  function sync(remote, chatDB) {
    syncDom.setAttribute('data-sync-state', 'syncing');
    var opts = {retry: true};
//    db.replicate.to(remoteCouch, opts, syncError);
    chatDB.replicate.from(remote, opts, syncError);
    }

  // EDITING STARTS HERE (you dont need to edit anything below this line)

  // There was some form or error syncing
  function syncError() {
    syncDom.setAttribute('data-sync-state', 'error');
  }

  // User has double clicked a todo, display an input so they can edit the title
  function todoDblClicked(todo) {
    var div = document.getElementById('li_' + todo._id);
    var inputEditTodo = document.getElementById('input_' + todo._id);
    div.className = 'editing';
    inputEditTodo.focus();
  }

  // If they press enter while editing an entry, blur it to trigger save
  // (or delete)
  function todoKeyPressed(todo, event) {
    if (event.keyCode === ENTER_KEY) {
      var inputEditTodo = document.getElementById('input_' + todo._id);
      inputEditTodo.blur();
    }
  }

  // Given an object representing a todo, this will create a list item
  // to display it.
  function createTodoListItem(todo) {
    var checkbox = document.createElement('input');
    checkbox.className = 'toggle';
    checkbox.type = 'checkbox';
    checkbox.addEventListener('change', checkboxChanged.bind(this, todo));

    var label = document.createElement('label');
    label.appendChild( document.createTextNode(todo.title));
    label.addEventListener('dblclick', todoDblClicked.bind(this, todo));

    var deleteLink = document.createElement('button');
    deleteLink.className = 'destroy';
    deleteLink.addEventListener( 'click', deleteButtonPressed.bind(this, todo));

    var divDisplay = document.createElement('div');
    divDisplay.className = 'view';
    divDisplay.appendChild(checkbox);
    divDisplay.appendChild(label);
    divDisplay.appendChild(deleteLink);

    var inputEditTodo = document.createElement('input');
    inputEditTodo.id = 'input_' + todo._id;
    inputEditTodo.className = 'edit';
    inputEditTodo.value = todo.title;
    inputEditTodo.addEventListener('keypress', todoKeyPressed.bind(this, todo));
    inputEditTodo.addEventListener('blur', todoBlurred.bind(this, todo));

    var li = document.createElement('li');
    li.id = 'li_' + todo._id;
    li.appendChild(divDisplay);
    li.appendChild(inputEditTodo);

    if (todo.completed) {
      li.className += 'complete';
      checkbox.checked = true;
    }

    return li;
  }

  function redrawChat1UI(chat) {
    var ul = document.getElementById('chat1-list');
    ul.innerHTML = '';
    chat.forEach(function(msg) {
      ul.appendChild(createTodoListItem(msg.doc));
    });
  }

  function redrawChat2UI(chat) {
    var ul = document.getElementById('chat2-list');
    ul.innerHTML = '';
    chat.forEach(function(msg) {
      ul.appendChild(createTodoListItem(msg.doc));
    });
  }

  function newTodoKeyPressHandler1( event ) {
    if (event.keyCode === ENTER_KEY) {
      addChat(newTodoDom1.value, db);
      newTodoDom1.value = '';
    }
  }

  function newTodoKeyPressHandler2( event ) {
    if (event.keyCode === ENTER_KEY) {
      addChat(newTodoDom2.value, db2);
      newTodoDom2.value = '';
    }
  }

  function addEventListeners() {
    newTodoDom1.addEventListener('keypress', newTodoKeyPressHandler1, false);
    newTodoDom2.addEventListener('keypress', newTodoKeyPressHandler2, false);
  }

  addEventListeners();
  showChat1();
  showChat2();

  if (remoteCouch) {
    backup(remoteCouch, db);
    sync(remoteCouch, db);
  }

  if (remoteCouch2) {
    backup(remoteCouch2, db2);
    sync(remoteCouch2, db2);
  }
})();
