/*global $ */

$( document ).ready(function() {

// --------------------
// - General Setup -
// --------------------

  // - Database Setup (Variables come from config File)-
  var cloudant_url = 'https://' + accountname + '.cloudant.com/' + db; // Set the general Cloudant URL
  var cloudant_auth = btoa(user + ':' + pass); // Creates a Base64 String of the User and Pass

  // - Create a new local PouchDB -
  var localDB = new PouchDB('todos');
  var remoteDB = new PouchDB(cloudant_url, { // Create a local CouchDB (aka. PouchDB) and a remote DB
    ajax: {
      cache: false,
      timeout: 10000,
      headers: {
        'Authorization': 'Basic '+ cloudant_auth
      },
    },
  });

  // - Listen to Changes Feed -
  localDB.changes({ // If something changes on the local db, call the changes() Function
    since: 'now',
    live: true
  }).on('change', function (change) {
    console.log("CHANGES!");
    changesChanging(change);
  }).on('error', function (err) {
    changesError(err);
  });

  // - Receive and print general DB information -
  localDB.info().then(function (info) {
    console.log(info);
  });

  // - Setup the replication/sync -
  var syncHandler = localDB.sync(remoteDB, {
      live: true, // Get the newest data live
      retry: true // Rety if connection was lost
    }).on('change', function (change) { // If changes occur
      showStatus('good', 'Changes found');
    }).on('complete', function (info) { // Is triggered by the cancel() function
      // replication was canceled!
    }).on('error', function (err) { // If an unexpected error occurs
      showStatus('bad', 'Uff! Unexpected error occured!');
      $.JSONView(info, $('#output-sync'));
      console.log('ERROR!');
      console.log(error);
    });

  // - Debugging -
  PouchDB.debug.disable(); //PouchDB.debug.enable('*'); // Enable Debugging, Disable via: PouchDB.debug.disable();

  // - Keys and Inputs -
  var enterKey = 13; // Code for Enter Key
  var todoInput = $('#todo_input').get(0); // Dom Reference for ToDo input Field
  var textInput = $('#text_input').get(0); // Dom Reference for Text input Field
  var syncbtn = $('#syncbtn').get(0); // Dom Reference for Sync button

  // - Other Global Variables -
  var onlineStat = false; // Indicates if the user has network access or not
  var colorChecked = ''; // Is used to store the color picked
  var currentList = 'default'; // Current list the todos get stored (ID=name+'tab')
  var allTodos = []; // Is used to store all current todos
  var allLists = []; // Is used to store all current lists
  var messages = []; // Is used to store all current messages (errors, etc.)
  var tabsDefaultHTML = $('#wrapper-tabs').html(); // Save the default and the plustab as standard

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
      _id: 'todo:'+title+':'+(new Date()).getTime(),
      title: title,
      text: text,
      color: mycolor,
      completed: false,
      list: currentList
    };

    localDB.put(todo, function callback(err, result) {
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

  function changesChanging(changes) {
    showTodos();
    showLists();
    console.log("Processing changes");
  }

  function changesError(err) {
    console.log(err);
  }

  // -- Show the ToDos from the database -- (reworked)
  function showTodos() {
    localDB.allDocs({ // Get all docs from local PouchDB
      include_docs: true, // Get the doc contents
      startkey: 'todo:', // with startkey Todo:
      endkey: 'todo<' // Ending with "todo<" means just that the ID starts with "Todo:" as "<" is the next symbol
    }).then(function (result) {
      allTodos = result.rows; // Get the rows
      redrawTodosUI(); // Redraw the UI with the new ToDos
      showStatus('good', 'Read all todos'); // Promt a message
      $.JSONView(result, $('#output-data'));
    }).catch(function (err) {
      showStatus('bad', 'Problem reading all todos'); // Print an error to the UI
      console.log(err);
    });
  }

  // -- Show & Load Lists --
  function showLists() {
    var newdocs = Array();
    localDB.allDocs({include_docs: true, descending: true}, function(err, doc) {
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
        showStatus('good', 'Read all lists');
      }else{
        showStatus('bad', 'Problem reading all todos');
      }
    });
  }

  // -- Draw ToDos -- (reworked)
  function redrawTodosUI() {
    if(allTodos.length === 0) { // If there are no ToDos at all
      $('#todo-list').empty().append('<li>No ToDos</li>'); // Write it to the list
      showStatus('good', 'Currently no ToDos'); // Prompt a message
    }else{ // Otherwise
      $('#todo-list').empty(); // Delete all contents in the list
      allTodos.forEach(function(todo) {
        if(todo.doc.list == currentList ) { // If the ToDo sits in the current List
          $('#todo-list').append(createTodoListItem(todo.doc)); // Add the todo to the list
        }
      });
      showStatus('good', 'Redrawing UI (ToDos)'); // Promt a message
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
        _id: 'list:'+name+':'+(new Date()).getTime(),
        title: name
      };

      localDB.put(list, function callback(err, result) {
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

  // -- Draw the Lists -- (reworked)
  function drawLists() {
    var lists = allLists;
    $('#wrapper-tabs').html(tabsDefaultHTML); // Reset the tabs to the default (empty except default and +)
    $('#' + currentList).addClass('defaulttab'); // Add the defaulttab class to the currentList
    clickableDefaultAndPlus(); // Make the Tabs clickable again

    redrawTodosUI(); // Redraw the UI as the ToDos change with a new list

    lists.forEach(function(list) { // For each list
      var div = document.createElement('div'); // Create a div Element
      div.id = list.doc.title; // The ID is the title of the list
      div.className = 'tab'; // The Class is 'tab'
      div.innerHTML = list.doc.title; // The HTML is also the title of the list
      $(div).insertBefore($('.plustab')); // Insert the tabs before the last (standard) tab

      $(div).click(function() { // Make the tab clickable
        tabClicked($(this)); // Call the tabClicked() Function
      });
    });
  }

  function checkboxChanged(todo, event) {
    console.log('Hi');
    todo.completed = event.target.checked;
    localDB.put(todo, function callback(err, result) {
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
    localDB.remove(todo, function callback(err, result) {
      if (!err) {
        showStatus('good', 'Sucessfully deleted ToDo: '+todo.title);
        $.JSONView(result, $('#output-resp'));
      }else{
        showStatus('bad', 'Problem deleting ToDo: '+todo.title);
      }
      console.log(err || result); // Log error or result to the consule for debugging
   });
  }

  // User pressed the delete button for a todo, delete it
  function editButtonPressed(todo) {
    alert("Changing is currently not supported");
  }

  // The input box when editing a todo has blurred, we should save
  // the new title or delete the todo if the title is empty
  function todoBlurred(todo, event) {
    var trimmedText = event.target.value.trim();
    if (!trimmedText) {
      localDB.remove(todo);
    } else {
      todo.title = trimmedText;
      localDB.put(todo);
    }
  }

  // Initialise a manual one-way sync with the remote server
  function sync() {
    showStatus('good', 'Syncing...');
    localDB.replicate.to(remoteDB);
    localDB.replicate.from(remoteDB);
  }

  // Initialise a manual two-way sync with the remote server
  function syncFrom() {
    showStatus('good', 'Syncing from db...');
    localDB.replicate.from(remoteDB
      ).on('change', function (change) { // If changes occur
        showStatus('good', 'Changes found');
        console.log(change);
      }).on('complete', function (complete) { // If an unexpected error occurs
        showStatus('good', 'Replication complete!');
        console.log('Replication Complete!');
        console.log(complete);
      }).on('error', function (err) { // If an unexpected error occurs
        showStatus('bad', 'Uff! Unexpected error occured!');
        console.log('Replication ERROR!');
        console.log(error);
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
      if(messages.indexOf(text) < 0) { // Check if message was not already published
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

// ------------------------------------------
// - Functions: Button Clicks & Input -
// ------------------------------------------

  // -- Clicked the Tab -- (reworked)
  function tabClicked(tab) {
    $('#'+currentList).removeClass('defaulttab'); // Remove the defaulttab class from the currentlist
    currentList = $(tab).attr('id'); // Set the currentlist to the new list
    $('#'+currentList).addClass('defaulttab'); // Add the defaulttab class to the new (current) list
    redrawTodosUI(); // Redraw the ToDos, as the list has changed
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

  function clickableDefaultAndPlus() { // Function needed, as they are dynamically deleted and recreated when the List changes
    // -- Click: Plustab (for new Tab) -- (reworked)
    $('#plustab').on('click', function() {
      var name = prompt('Enter list name (max. 8 char)','listname'); // Do a promt to enter a new list
      if (name !== '') { // Was someting entered?
        addList(name); // Add the list
      }
    });

    // --Click: tab (for changing List) -- (reworked)
    $('#default').on('click', function() {
      tabClicked($(this));
    });
  }

  // -- Hover: Circle (for adding color) -- (reworked)
  $('.circle').hover(function() {
    $( this ).addClass( 'circlehover' );
  }, function() {
    $( this ).removeClass( 'circlehover' );
  });

  // -- Click: Circle (for adding color) -- (reworked)
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

  // -- Click: Sync From Button -- (reworked)
  $('#syncfrombtn').click(function() {
    syncFrom();
  });


  // -----------------------------------
  // - Intervals & Event Listeners -
  // -----------------------------------

  // -- Adds several Event Listeners --
  function addEventListeners() {
    todoInput.addEventListener('keypress', newTodoKeyPressHandler, false);  // Adds Event Listener for ToDo Input
    syncbtn.addEventListener('click', syncPressed, false);
  }

  // -- Check online Status --
  function checkOnline() {
    var online = navigator.onLine;
    if(online) {
      $('#online_status').html('Online');
      $('#status').css('color', '#390');
      if(!onlineStat) {
        onlineStat = true;
      }
    }else{
      $('#online_status').html('Offline');
      $('#status').css('color', '#C30');
      onlineStat = false;
    }
  }

  // ------------------------
  // - General first calls -
  // ------------------------

  $('#wrapper-status').hide();   // Hide the Infobox at startup

  var doc = '{}';
  $.JSONView(doc, $('#output-data')); // Add the default JSON error data
  $.JSONView(doc, $('#output-resp')); // Add the default JSON error data
  $.JSONView(doc, $('#output-sync')); // Add the default JSON error data

  addEventListeners(); // Adds Event Listeners
  showTodos(); // Reads ToDos
  showLists(); // Reads Lists

  setInterval(checkOnline, 1000);
  clickableDefaultAndPlus();
});
