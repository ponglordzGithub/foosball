var players;
var rankings;
var timer;

function getPlayerName(playerid, full) {
    var name = null;
    for (var i = 0; i < players.length; i++) {
        if (parseInt(players[i][0]) === playerid) {
            name = full ? players[i][1] : players[i][1].substr(0, players[i][1].indexOf(' '));
            break;
        }
    }
    return name;
}

function getPlayerIndex(playerid) {
    var index = null;
    for (var i = 0; i < players.length; i++) {
        if (parseInt(players[i][0]) === playerid) {
            index = i + 1;
            break;
        }
    }
    return index;
}

function getTeamPlayersText(player1id, player2id) {
    if (player1id === 0) {
        return getPlayerName(player2id, false);
    }
    if (player2id === 0) {
        return getPlayerName(player1id, false);
    }
    return getPlayerName(player1id, false) + ' & ' + getPlayerName(player2id, false);
}

function updateTeamNames() {
    var result = getSelectedPlayers();
    if (typeof result === 'string') {
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
    if (typeof selectedPlayers === 'string') {
        return;
    }
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
        var select1 = $('#game select')[2];
        var select2 = $('#game select')[3];
        $(select1).prop('selectedIndex', getPlayerIndex(data[0]));
        $(select2).prop('selectedIndex', data.length > 1 ? getPlayerIndex(data[1]) : 0);
        updateTeamNames();
        validate();
        updateMatchScore();
    });
}

function getSelectedPlayers(checkOnlyFirstTeam) {
    var players = [];
    $('#game select').each(function() {
        var val = $('option:selected', this).val();
        if (val !== null && val !== undefined) {
            players.push(parseInt(val));
        }
    });
    if (players.length !== 4) {
        return 'Incorrect number of selected options';
    }
    if (checkOnlyFirstTeam) {
        players = players.slice(0,2);
    }
    if ((players[0] === 0 && players[1] === 0) || (!checkOnlyFirstTeam && (players[2] === 0 && players[3] === 0))) {
        return 'Please select players for each team';
    }
    var sorted = players.slice(0);
    sorted.sort();
    if ((sorted[0] === sorted[1] && sorted[0] !== 0) || (!checkOnlyFirstTeam && (sorted[1] === sorted[2] || sorted[2] === sorted[3]))) {
        return 'Please use unique players for each team';
    }
    return players;
}

function enableButton(name, state) {
    if (state)
        $(name).removeClass('disabled').removeAttr("disabled");
    else
        $(name).addClass('disabled').attr("disabled", "disabled");
}

function validate() {
    var scores = getScores();
    var valid = (scores[0] === 10 && scores[1] !== 10) || (scores[0] !== 10 && scores[1] === 10);
    if (valid) {
        var selectedPlayers = getSelectedPlayers();
        if (typeof selectedPlayers === 'string') {
            valid = false;
        }
    }
    enableButton('#submit', valid);

    var selectedFirstTeamPlayers = getSelectedPlayers(true);
    enableButton('#findmatch', typeof selectedFirstTeamPlayers !== 'string');
}

function getScores() {
    var score1 = parseInt($('.team1score.active').prop('id').substr(6));
    var score2 = parseInt($('.team2score.active').prop('id').substr(6));
    return [score1, score2];
}

function submit() {
    var players = getSelectedPlayers();
    var scores = getScores();
    var teamNames = [getTeamPlayersText(players[0], players[1]), getTeamPlayersText(players[2], players[3])];
    var winningTeam = scores[0] > scores[1] ? 0 : 1;
    var losingTeam = 1 - winningTeam;
    var msg = 'Please confirm that ' + teamNames[winningTeam] + ' ' + (scores[losingTeam] === 0 ? 'skunked ' + teamNames[losingTeam] : 'won the match') + ' with score ' + scores[winningTeam] + ':' + scores[losingTeam];
    if (confirm(msg)) {
        $('#submit').button('loading');
        var url = 'api.php?action=update&team1=' + players[0] + ',' + players[1] + '&team2=' + players[2] + ',' + players[3] + '&scores=' + scores[0] + ',' + scores[1];
        $.getJSON(url, function(data) {
            $('#submit').button('reset');
            if (data !== 'OK') {
                alert(data);
            } else {
                setTimeout(resetScores, 0);
            }
        });
    }
}

function swap(player1, player2) {
    var select1 = $('#game select')[player1-1];
    var select2 = $('#game select')[player2-1];
    var index1 = $(select1).prop('selectedIndex');
    var index2 = $(select2).prop('selectedIndex');
    $(select1).prop('selectedIndex', index2);
    $(select2).prop('selectedIndex', index1);
    updateTeamNames();
    validate();
    updateMatchScore();
}

function chart() {
    var el = $('#graph');
    if (!el.is(':visible')) {
        return;
    }
    el.height(Math.max(300, $(window).height() - el.position().top - 40));
    var options = {
        xaxis : {
            mode : 'time',
            noTicks: 10
        },
        yaxis : {
            showLabels : false,
            autoscale: true,
            autoscaleMargin: 0.05
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
    $('#score10').button('toggle');
    $('#score20').button('toggle');
    validate();
}

$(document).ready(function() {
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

    $('body').on('click', '.team1score,.team2score', function(e) {
        e.stopImmediatePropagation();
        $(this).button('toggle');
        $($(this).hasClass('team1score') ? '#score210' : '#score110').button('toggle');
        validate();
    });

    function switchTab() {
        var tab = window.location.hash;
        if (!tab || tab === "#") tab = "#game";
        $('.nav a[href="' + tab + '"]').tab('show');
    }
    switchTab();
    $(window).on('hashchange', switchTab);
    $('.nav a').on('click', function (e) {
        var href = $(e.target).attr("href");
        if (href === "#game") href = "";
        window.location.hash = href;
        switchTab();
        e.preventDefault();
    });
});

var statNames = {
    'games': 'Total games played',
    'wins': 'Number of wins',
    'losses': 'Number of losses',
    'wins_goalee': 'Wins while shooting first',
    'losses_goalee': 'Losses while shooting first',
    'wins_midfield': 'Wins while shooting second',
    'losses_midfield': 'Losses while shooting second',
    'skunk_wins': 'Number of skunk wins',
    'skunk_losses': 'Number of skunk losses',
    'best_partner': 'Best partner',
    'worst_partner': 'Worst partner',
    'best_opponent': 'Best opponent',
    'worst_opponent': 'Worst opponent',
    'winning_score': 'Top winning score',
    'losing_score': 'Top losing score',
    'winning_streak': 'Longest winning streak',
    'losing_streak': 'Longest losing streak'
};

function showProfile(playerid) {
    $('.nav a[href="#profile"]').tab('show');
    $.getJSON('api.php?action=profile&id=' + playerid, function(data) {
        var html = '<thead><tr><td colspan="2"><h2>' + getPlayerName(playerid, true) + '</h2></td></tr></thead>';
        $.each(statNames, function(key, value) {
            html += '<tr>';
            html += '<td>' + value + '</td>';
            var val = data[key];
            if (key.indexOf('partner') !== -1 || key.indexOf('opponent') !== -1) {
                val = getPlayerName(val, false);
            }
            if (key === 'wins' || key === 'losses') {
                val += ' (' + Math.round(val * 100 / data['games']) + '%)';
            }
            if (key.indexOf('wins_') !== -1) {
                val += ' (' + Math.round(val * 100 / data['wins']) + '%)';
            }
            if (key.indexOf('losses_') !== -1) {
                val += ' (' + Math.round(val * 100 / data['losses']) + '%)';
            }
            html += '<td>' + val + '</td>';
            html += '</tr>';
        });
        $('#profilegrid').html(html);
    });
}

$('.nav a[href="#stats"]').live('show', function() {
    $.getJSON('api.php?action=ranking', function(data) {
        var html = '';
        var position = 1;
        $.each(data, function(key, value) {
            html += '<tr>';
            html += '<td>' + position + '</td>';
            html += '<td><a href="#" onclick="showProfile(' + value[0] + ')">' + value[1] + '</a></td>';
            html += '<td>' + value[2] + '</td>';
            html += '</tr>';
            position++;
        });
        $('#rankgrid').html(html);
    });

    $.getJSON('api.php?action=history', function(data) {
        var d = [];
        $.each(data, function(key, value) {
            if (d[value[1]] === null || d[value[1]] === undefined) {
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
        date = (date.getMonth()+1) + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + date.getHours() + ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
        var team1 = value[1].split(',');
        var team2 = value[2].split(',');
        team1 = getTeamPlayersText(parseInt(team1[0]), team1.length > 1 ? parseInt(team1[1]) : 0);
        team2 = getTeamPlayersText(parseInt(team2[0]), team2.length > 1 ? parseInt(team2[1]) : 0);
        var scores = value[3].split(',');
        scores = scores[0] + ':' + scores[1];
        html += '<tr>';
        html += '<td>' + date + '</td>';
        html += '<td>' + team1 + '</td>';
        html += '<td>' + team2 + '</td>';
        html += '<td>' + scores + '</td>';
        html += '</tr>';
    });
    $('#loggrid').html(html);
}

$('.nav a[href="#log"]').live('show', function() {
    $.getJSON('api.php?action=log', function(data) {
        if (players) {
            populateLogGrid(data);
        } else {
            $.getJSON('api.php?action=players', function(data1) {
                players = data1;
                players.sort(function(a, b) { a = a[1]; b = b[1]; return a < b ? -1 : (a > b ? 1 : 0); });
                populateLogGrid(data);
            });
        }
    });
});

$(window).resize(function() {
    if (timer) {
        window.clearTimeout(timer);
    }
    timer = window.setTimeout(chart, 200);
});

$('a, button').bind('tap', function(e) {
    $(this).trigger('click');
    e.preventDefault();
});
