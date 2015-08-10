/*global $ */

$( document ).ready(function() {

// --------------------
// - General Setup -
// -------------------

  // - Database Setup (Variables come from config File)-
  var cloudant_url = 'https://' + user + ':' + pass + '@' + username + '.cloudant.com'; // Set the general Cloudant URL
  var remoteCouch = cloudant_url + '/' + db; // Set the full path to the "remote Couch" (aka. Cloudant)

  // - Create a new local PouchDB -
  var db = new PouchDB('todos'), // Create a local CouchDB (aka. PouchDB)
    remote = remoteCouch, // Give it the remote Couch as a variable
    opts = { continuous: true }; // Make the replication continous

  // - Listen to Changes Feed -
  db.info(function(err, info) {
    db.changes({ since: info.update_seq, live: true }).on('change', changes); // If something changes on the local db, call the changes() Function
    console.log(err || info);
  });

  // - Keys and Inputs -
  var enterKey = 13; // Code for Enter Key
  var todoInput = $('#todo_input').get(0); // Dom Reference for ToDo input Field
  var textInput = $('#text_input').get(0); // Dom Reference for Text input Field
  var syncbtn = $('#syncbtn').get(0); // Dom Reference for Sync button

  // - Global Variables -
  var messages = [];
  var onlineStat = false;
  var colorChecked = '';
  var currentList = 'default'; // Current list the todos get stored (ID=name+'tab')
  var allTodos = [];
  var allLists = [];

  // - Styling -
  var myCss = document.createElement('link');
  myCss.type = 'text/css';
  myCss.rel = 'stylesheet';

  // - Workaround for iPhone & iPad -
  if((navigator.userAgent.match(/iPhone/i)) || (navigator.userAgent.match(/iPod/i))) {
    myCss.href = 'css/iPhone.css';
    document.getElementsByTagName('head')[0].appendChild(myCss);
  }else if(navigator.userAgent.match(/iPad/i)){
    myCss.href = 'css/iPad.css';
    document.getElementsByTagName('head')[0].appendChild(myCss);
  }

  $('#'+currentList).addClass('defaulttab');

// ---------------
// - Functions -
// ---------------

  // -- Add a ToDo to the database --
  function addTodo(title, text) {
    var mycolor = '';
    if(colorChecked === '') {
      mycolor = 'black';
    }else{
      mycolor = colorChecked.attr('value');
    }

    var todo = {
      _id: 'todo:'+title,
      title: title,
      text: text,
      color: mycolor,
      completed: false,
      list: currentList
    };

    db.put(todo, function callback(err, result) {
      if (!err) {
        console.log('Successfully posted a todo!');
        showStatus('good', 'New ToDo created: '+text);
        $.JSONView(result, $('#output-resp'));
      }else{
        showStatus('bad', 'Problem creating ToDo: '+text);
      }
      console.log(err || result);
    });
  }

  function changes() {
    showTodos();
    showLists();
  }

  // -- Show the ToDos from the database --
  function showTodos() {
    db.allDocs({include_docs: true, descending: true}, function(err, doc) {
      if(!err) {
        allTodos = doc.rows;
        redrawTodosUI();
        showStatus('good', 'Read all todos');
        $.JSONView(doc, $('#output-data'));
      }else{
        showStatus('bad', 'Problem reading all todos');
      }
    });
  }

  // -- Draw ToDos --
  function redrawTodosUI() {
    var todos_sorted = Array();
    var todos = allTodos;

    todos.forEach(function(entry) {
      var str = entry.id;
      var res = str.split(':');
      if(res[0] == 'todo') {
        if(entry.doc.list == currentList) {
          todos_sorted.push(entry);
        }
      }
    });

    if(todos_sorted.length === 0) {
      $('#todo-list').empty().append('<li>No ToDos</li>');
    }else{
      var ul = document.getElementById('todo-list');
      ul.innerHTML = '';
      todos_sorted.forEach(function(todo) {
        ul.appendChild(createTodoListItem(todo.doc));
      });
      showStatus('good', 'Redrawing UI');
    }
  }

  // -- Show the Lists from the database --
  function addList (name) {
    if(name.length <= 8) {
      var div = document.createElement('div');
      div.id = name;
      div.className = 'tab';
      div.innerHTML = name;
      $(div).insertBefore($('.plustab'));

      var list= {
        _id: 'list:'+name,
        title: name
      };
      db.put(list, function callback(err, result) {
        if (!err) {
          console.log('Successfully created a list!');
          showStatus('good', 'New List created: '+name);
          $.JSONView(result, $('#output-resp'));
        }else{
          showStatus('bad', 'Problem creating List: '+name);
        }
        console.log(err || result);
      });

      $(div).click(function() {
        tabClicked($(this));
      });

    }else{
      alert('Please don\'t add more than 8 chars');
    }
  }

  // -- Load Lists --
  function showLists() {
    var newdocs = Array();
    db.allDocs({include_docs: true, descending: true}, function(err, doc) {
      doc.rows.forEach(function(entry) {
        var str = entry.id;
        var res = str.split(':');
        if(res[0] == 'list') {
          newdocs.push(entry);
        }
      });

      allLists = newdocs;
      drawLists(newdocs);

      if (!err) {
        showStatus('good', 'Read all todos');
        $.JSONView(doc, $('#output-data'));
      }else{
        showStatus('bad', 'Problem reading all todos');
      }
    });
    showStatus('good', 'Changes detected!');
  }

  // -- Draw the Lists --
  function drawLists() {
    var lists = allLists;
    $('#wrapper-tabs').html('<div class="tab" id="default">default</div><div class="plustab" id="plustab">+</div>');
    $('#' + currentList).removeClass('defaulttab');
    $('#' + currentList).addClass('defaulttab');

    redrawTodosUI();

    lists.forEach(function(list) {
      var div = document.createElement('div');
      div.id = list.doc.title;
      div.className = 'tab';
      div.innerHTML = list.doc.title;
      $(div).insertBefore($('.plustab'));

      $(div).click(function() {
        tabClicked($(this));
      });
    });
  }

  function checkboxChanged(todo, event) {
    console.log('Hi');
    todo.completed = event.target.checked;
    db.put(todo, function callback(err, result) {
      if (!err) {
        showStatus('good', 'Changed ToDo: '+todo.title);
        $.JSONView(result, $('#output-resp'));
      }else{
        showStatus('bad', 'Problem changing ToDo: '+todo.title);
      }
      console.log(err || result);
   });
  }

  // User pressed the delete button for a todo, delete it
  function deleteButtonPressed(todo) {
    db.remove(todo, function callback(err, result) {
      if (!err) {
        showStatus('good', 'Sucessfully deleted ToDo: '+todo.title);
        $.JSONView(result, $('#output-resp'));
      }else{
        showStatus('bad', 'Problem deleting ToDo: '+todo.title);
      }
      console.log(err || result);
   });
  }

  // User pressed the delete button for a todo, delete it
  function editButtonPressed(todo) {
    db.remove(todo, function callback(err, result) {
      if (!err) {
        showStatus('good', 'Sucessfully deleted ToDo: '+todo.title);
        $.JSONView(result, $('#output-resp'));
      }else{
        showStatus('bad', 'Problem deleting ToDo: '+todo.title);
      }
      console.log(err || result);
   });
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

  // Initialise a sync with the remote server
  function sync() {
    showStatus('good', 'Syncing...');
    var opts = {
        live: true,
        filter: function(doc) {
          return doc._id.indexOf('_design') !== 0;
        }
    };

    db.replicate.to(remote, opts, syncError)
        .on('change', function (info) {
          showStatus('good', 'Sending changes to remote');
        }).on('uptodate', function (info) {
          $.JSONView(info, $('#output-sync'));
          showStatus('good', 'Sync to remote complete. ('+info.docs_read+' read/'+info.docs_written+' written)');
        }).on('error', function (err) {
          $.JSONView(info, $('#output-sync'));
          console.log('ERROR!');
          console.log(error);
          showStatus('bad', 'Remote Database not found');
        });

      db.replicate.from(remote, opts, syncError)
        .on('change', function (info) {
          showStatus('good', 'Receiving changes from remote');
        }).once('uptodate', function (info) {
          $.JSONView(info, $('#output-sync'));
          showStatus('good', 'Sync from remote complete. ('+info.docs_read+' read/'+info.docs_written+' written)');
        }).on('error', function (err) {
          $.JSONView(info, $('#output-sync'));
          console.log('ERROR!');
          console.log(error);
          showStatus('bad', 'Remote Database not found');
        });
  }

  function syncFrom() {
    showStatus('good', 'Syncing from db...');
    var opts = {
        live: true,
        filter: function(doc) {
          return doc._id.indexOf('_design') !== 0;
        }
    };

      db.replicate.from(remote, opts, syncError)
        .on('change', function (info) {
          showStatus('good', 'Receiving changes from remote');
        }).once('uptodate', function (info) {
          $.JSONView(info, $('#output-sync'));
          showStatus('good', 'Sync from remote complete. ('+info.docs_read+' read/'+info.docs_written+' written)');
        }).on('error', function (err) {
          alert(error);
          $.JSONView(info, $('#output-sync'));
          console.log('ERROR!');
          console.log(error);
          showStatus('bad', 'Remote Database not found');
        });
  }

  // EDITING STARTS HERE (you dont need to edit anything below this line)

  // There was some form or error syncing
  function syncError(error) {
    showStatus('Bad', 'Sync error! Check network connection.');
    console.log('Error: '+error);
  }

  // User has double clicked a todo, display an input so they can edit the title
  function todoDblClicked(todo) {
    var div = document.getElementById('li_' + todo._id);
    var inputEditTodo = document.getElementById('input_' + todo._id);
    div.className = 'editing';
    inputEditTodo.focus();
  }

  // Given an object representing a todo, this will create a list item
  // to display it.
  function createTodoListItem(todo) {
    var checkbox = document.createElement('input');
    checkbox.className = 'toggle';
    checkbox.id = 'chk_'+todo.title;
    checkbox.type = 'checkbox';
    checkbox.addEventListener('change', checkboxChanged.bind(this, todo));

    var label = document.createElement('label');
    label.setAttribute('for', checkbox.id);
    label.appendChild(document.createTextNode(todo.title));

    var deleteLink = document.createElement('button');
    deleteLink.className = 'destroy';
    deleteLink.addEventListener( 'click', deleteButtonPressed.bind(this, todo));

    var editLink = document.createElement('button');
    editLink.className = 'edit';
    editLink.addEventListener( 'click', editButtonPressed.bind(this, todo));

    var divDisplay = document.createElement('div');
    divDisplay.className = 'view';
    divDisplay.appendChild(checkbox);
    divDisplay.appendChild(label);

    divDisplay.appendChild(deleteLink);
    divDisplay.appendChild(editLink);

    var li = document.createElement('li');
    li.id = 'li_' + todo._id;
    li.appendChild(divDisplay);

    if (todo.completed) {
      li.className += 'complete';
      checkbox.checked = true;
    }

    return li;
  }

  // - Show the Status Message on top of the page -
  function showStatus(mood, text) {
    if(mood === 'bad') { // Depending on the 'mood' change the color of the div
      $( '#wrapper-status' ).css( 'background-color', '#C30'); // Change div color to red
    }else{
      $( '#wrapper-status' ).css( 'background-color', '#390'); // Change div color to green
    }

    if ($('#wrapper-status').is(':visible')) { // When the div is visible
      if(messages.indexOf(text) >= 0) { // Check if message was already published
        console.log(messages.toString());
      }else{
        $( '#toodle' ).append('</br>'+text); // Just appent the text
        messages.push(text);
      }
    }else{
      $( '#toodle' ).empty().append(text); // Add Message to the Error - div
      $( '#wrapper-status' ).show('Blind'); // Show the Error - div
      $('#wrapper-status').delay(8000).hide('Blind'); // Remove the Error - div after 8sec
      messages.length = 0; // Empty messages Array
    }
  }

  // Hide Infobox
  $('#wrapper-status').hide();

  var doc = '{}';
  $.JSONView(doc, $('#output-data')); // Add the default JSON error data
  $.JSONView(doc, $('#output-resp')); // Add the default JSON error data
  $.JSONView(doc, $('#output-sync')); // Add the default JSON error data

  addEventListeners(); // Adds Event Listeners
  showTodos(); // Reads ToDos
  showLists(); // Reads Lists


// ------------------------------------------
// - Functions: Button Clicks & Input -
// ------------------------------------------

// -- Clicked the Tab --
function tabClicked(tab) {
  $('#'+currentList).removeClass('defaulttab');
  currentList = $(tab).attr('id');
  console.log($(tab).attr('id'));
  $('#'+currentList).addClass('defaulttab');

  redrawTodosUI();
}

// -- Clicked Sync --
function syncPressed(event) {
  sync();
}

// -- Entered New ToDo --
function newTodoKeyPressHandler( event ) { // Handles the Enter Key Press
  if (event.keyCode === enterKey) {
    addTodo(todoInput.value, textInput.value);
    todoInput.value = '';
    textInput.value = '';
    if(colorChecked !== '') {
      colorChecked.removeClass( 'circleclicked' );
      colorChecked = '';
    }
  }
}

function todoKeyPressed(todo, event) {
  if (event.keyCode === enterKey) {
    var inputEditTodo = document.getElementById('input_' + todo._id);
    inputEditTodo.blur();
  }
}

// -----------------------------
// - Button Clicks & Input -
// -----------------------------

  // -- Click: Plustab (for new Tab) --
  $('#plustab').click(function() {
    var name = prompt('Enter list name (max. 8 char)','listname');

    addList(name);
  });

  // --Click: tab (for changing List) --
  $('#defaut').click(function() {
    tabClicked($(this));
  });


  // -- Hover: Circle (for adding color) --
  $('.circle').hover(function() {
    $( this ).addClass( 'circlehover' );
  }, function() {
    $( this ).removeClass( 'circlehover' );
  });

  // -- Click: Circle (for adding color) --
  $('.circle').click(function() {
    if(colorChecked === '') {
      $( this ).addClass( 'circleclicked' );
      colorChecked = $( this );
    }else{
      colorChecked.removeClass( 'circleclicked' );
      $( this ).addClass( 'circleclicked' );
      colorChecked = $( this );
    }
  });

  $('#syncfrombtn').click(function() {
    syncFrom();
  });


  // -----------------------------------
  // - Intervals & Event Listeners -
  // -----------------------------------

  function addEventListeners() {
    todoInput.addEventListener('keypress', newTodoKeyPressHandler, false);  // Adds Event Listener for ToDo Input
    syncbtn.addEventListener('click', syncPressed, false);
  }

  // -- Check online Status --
  setInterval(checkOnline, 1000);
  function checkOnline() {
    var online = navigator.onLine;
    if(online) {
      $('#online_status').html('Online');
      $('#status').css('color', '#390');
      if(!onlineStat) {
        onlineStat = true;
        if (remoteCouch) { // Syncs if remote Couch is available
          sync();
        }
      }
    }else{
      $('#online_status').html('Offline');
      $('#status').css('color', '#C30');
      onlineStat = false;
    }
  }

});
