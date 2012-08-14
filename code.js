var players;
var rankings;
var timer;

function getPlayerName(playerid) {
  for (var i = 0; i < players.length; i++) {
    if (players[i][0] == playerid)
      return players[i][1].substr(0, players[i][1].indexOf(' '));
  }
}

function getPlayerIndex(playerid) {
  for (var i = 0; i < players.length; i++) {
    if (players[i][0] == playerid)
      return i + 1;
  }
}

function getTeamPlayersText(player1id, player2id) {
  if (player1id == 0) return getPlayerName(player2id);
  if (player2id == 0) return getPlayerName(player1id);
  return getPlayerName(player1id) + ' & ' + getPlayerName(player2id);
}

function updateTeamNames() {
  var result = getSelectedPlayers();
  if (typeof result == 'string') {
    $('#team1').html('Team 1');
    $('#team2').html('Team 2');
    return;
  }
  $('#team1').html(getTeamPlayersText(result[0], result[1]));
  $('#team2').html(getTeamPlayersText(result[2], result[3]));
}

function addPlayersToSelect(listName) {
  $.each(players, function(key, value) {
    $('#'+listName).append('<option value='+value[0]+'>'+value[1]+'</option>');
  });

  $('#'+listName).bind('change', function() {
    updateTeamNames();
    validate();
    updateMatchScore();
  });
}

function updateMatchScore()
{
  $('#matchscore').html('');
  var selectedPlayers = getSelectedPlayers();
  if (typeof selectedPlayers == 'string') return;
  var url = 'api.php?action=match&team1=' + selectedPlayers[0] + ',' + selectedPlayers[1] + '&team2=' + selectedPlayers[2] + ',' + selectedPlayers[3];
  $.getJSON(url, function(data) {
    $('#matchscore').html(' (' + data + '% match)');
  });
}

function findBestMatch()
{
  var players = getSelectedPlayers(true);
  var url = 'api.php?action=match&team1=' + players[0] + ',' + players[1];
  $.getJSON(url, function(data) {
    var select1 = $('#sortable select')[2];
    var select2 = $('#sortable select')[3];
    $(select1).prop('selectedIndex', getPlayerIndex(data[0])).selectmenu('refresh');
    $(select2).prop('selectedIndex', data.length > 1 ? getPlayerIndex(data[1]) : 0).selectmenu('refresh');
    updateMatchScore();
  });
}

function getSelectedPlayers(checkOnlyFirstTeam) {
  var players = [];
  $('#sortable li').each(function(){
    var val = $('option:selected', this).val();
    if (val != null) players.push(val);
  });
  if (players.length != 4) return 'Incorrect number of selected options';
  if (checkOnlyFirstTeam) players = players.slice(0,2);
  if ((players[0] == 0 && players[1] == 0) || (!checkOnlyFirstTeam && (players[2] == 0 && players[3] == 0))) return 'Please select players for each team';
  var sorted = players.slice(0);
  sorted.sort();
  if ((sorted[0] == sorted[1] && sorted[0] != 0) || (!checkOnlyFirstTeam && (sorted[1] == sorted[2] || sorted[2] == sorted[3]))) return 'Please use unique players for each team';
  return players;
}

function validate() {
  var scores = getScores();
  var valid = (scores[0] == 5 && scores[1] != 5) || (scores[0] != 5 && scores[1] == 5);
  if (valid) {
    var selectedPlayers = getSelectedPlayers();
    if (typeof selectedPlayers == 'string') valid = false;
  }
  $('#submit').button(valid ? 'enable' : 'disable');

  var players = getSelectedPlayers(true);
  $('#findmatch').button(typeof players != 'string' ? 'enable' : 'disable');
}

function getScores() {
  var score1 = $('input[name=team1score]:checked').prop('id').substr(6);
  var score2 = $('input[name=team2score]:checked').prop('id').substr(6);
  return [score1, score2];
}

function submit() {
  var players = getSelectedPlayers();
  var scores = getScores();
  var teamNames = [getTeamPlayersText(players[0], players[1]), getTeamPlayersText(players[2], players[3])];
  var winningTeam = scores[0] > scores[1] ? 0 : 1;
  var losingTeam = 1 - winningTeam;
  var msg = 'Please confirm that ' + teamNames[winningTeam] + ' ' + (scores[losingTeam] == 0 ? 'skunked ' + teamNames[losingTeam] : 'won the match') + ' with score ' + scores[winningTeam] + ':' + scores[losingTeam];
  if (confirm(msg)) {
    var url = 'api.php?action=update&team1=' + players[0] + ',' + players[1] + '&team2=' + players[2] + ',' + players[3] + '&scores=' + scores[0] + ',' + scores[1];
    $.getJSON(url, function(data) {
      if (data != 'OK') alert(data);
      else resetScores();
    });
  }
}

function swap(player1, player2) {
  var select1 = $('#sortable select')[player1-1];
  var select2 = $('#sortable select')[player2-1];
  var index1 = $(select1).prop('selectedIndex');
  var index2 = $(select2).prop('selectedIndex');
  $(select1).prop('selectedIndex', index2).selectmenu('refresh');
  $(select2).prop('selectedIndex', index1).selectmenu('refresh');
}

function chart() {
  var el = $('#graph');
  if (!el.is(':visible')) return;
  el.height($(window).height() - el.position().top - 40);
  var options = {
    xaxis : {
      mode : 'time',
      noTicks: 10
    },
    yaxis : {
      showLabels : false
    },
    legend: {
      backgroundOpacity: 0.75
    }
  };
  el.html('');
  var graph = document.getElementById('graph');
  Flotr.draw(graph, rankings, options);
}

function resetScores() {
  $('#score10').prop('checked', true);
  $('#score20').prop('checked', true);
  $('input[type=radio]').checkboxradio("refresh");
  validate();
}


$('#game').live('pageinit', function() {
  updateTeamNames();
  resetScores();

  $.getJSON('api.php?action=players', function(data) {
    players = data;
    players.sort(function(a, b) { a = a[1]; b = b[1]; return a < b ? -1 : (a > b ? 1 : 0); });
    addPlayersToSelect('player11');
    addPlayersToSelect('player12');
    addPlayersToSelect('player21');
    addPlayersToSelect('player22');
  });

  $('input[type=radio]').bind('change', function() {
    validate();
  });

  $('#sortable')
    .sortable({
      items: 'li:not(.static)',
      start: function(){
        $('.static', this).each(function(){
          var $this = $(this);
          $this.data('pos', $this.index());
        });
      },
      change: function() {
        $sortable = $(this);
        $statics = $('.static', this).detach();
        $helper = $('<li></li>').prependTo(this);
        $statics.each(function(){
          var $this = $(this);
          var target = $this.data('pos');
          $this.insertAfter($('li', $sortable).eq(target));
        });
        $helper.remove();
      },
      stop: function() {
        updateTeamNames();
        validate();
        updateMatchScore();
      }
    })
    .disableSelection();
});

$('#stats').live('pageshow', function() {
  $.getJSON('api.php?action=ranking', function(data) {
    var html = '';
    $.each(data, function(key, value) {
      html += '<div class="ui-block-a">' + value[1] + '</div>';
      html += '<div class="ui-block-b">' + value[2] + '</div>';
    });
    $('#rankgrid').html(html);
  });

  $.getJSON('api.php?action=history', function(data) {
    var d = [];
    $.each(data, function(key, value) {
      if (d[value[1]] == null) {
        d[value[1]] = { data: [], label: value[2], lines : { show : true }, points : { show : true } };
      }
      d[value[1]].data.push([new Date(value[0] * 1000), value[3]]);
    });
    rankings = d.splice(1);
    chart();
  });
});

function populateLogGrid(data)
{
  var html = '';
  $.each(data, function(key, value) {
    var date = new Date(value[0] * 1000);
    date = date.getMonth() + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    var team1 = value[1].split(',');
    var team2 = value[2].split(',');
    team1 = getTeamPlayersText(team1[0], team1.length > 1 ? team1[1] : 0);
    team2 = getTeamPlayersText(team2[0], team2.length > 1 ? team2[1] : 0);
    var scores = value[3].split(',');
    scores = scores[0] + ':' + scores[1];
    html += '<div class="ui-block-a ui-bar-c">' + date + '</div>';
    html += '<div class="ui-block-b ui-bar-c">' + team1 + '</div>';
    html += '<div class="ui-block-c ui-bar-c">' + team2 + '</div>';
    html += '<div class="ui-block-d ui-bar-c">' + scores + '</div>';
  });
  $('#loggrid').html(html);
}

$('#log').live('pageshow', function() {
  $.getJSON('api.php?action=log', function(data) {
    if (players) populateLogGrid(data);
    else {
      $.getJSON('api.php?action=players', function(data1) {
        players = data1;
        players.sort(function(a, b) { a = a[1]; b = b[1]; return a < b ? -1 : (a > b ? 1 : 0); });
        populateLogGrid(data);
      });
    }
  });
});

$(window).resize(function() {
  if (timer) window.clearTimeout(timer);
  timer = window.setTimeout(chart, 200);
});

$('a, button').bind('tap', function(e) {
    $(this).trigger('click');
    e.preventDefault();
});
