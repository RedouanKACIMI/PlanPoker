var stompClient = null;

const deck= [
    { cardName: 1, value: 1 },
    { cardName: 2, value: 2 },
    { cardName: 3, value: 3 },
    { cardName: 5, value: 5 },
    { cardName: 8, value: 8 },
    { cardName: 13, value: 13 },
    { cardName: 20, value: 20 },
    { cardName: 40, value: 40 },
    { cardName: 100, value: 100 }
]

let players = new Map();
class Player {
    constructor(sid, name, vote) {
        this.sid = sid;
        this.name = name;
        this.vote = vote;
        this.elem = newElemPlayer(name, vote);
        this.card = this.elem.getElementsByClassName("player-card")[0];
    }
    updateCard(vote){
        this.unvoted();
        if (vote === "0")
            this.card.innerHTML = "";
        else
            this.card.innerHTML = vote;
    }
    voted(){
        this.elem.className = "player-seat card-voted";
    }
    unvoted(){
        this.elem.className = "player-seat";
    }
}

function setup(){
    $("#casino").hide();
    $("#cardSet").hide();
    $("form").on('submit', function (e) {
        e.preventDefault();
    });

    deck.forEach((card) => {
        let li = newElemCard(card.cardName, card.value);
        let cardSet = document.getElementById("cardSet");
        cardSet.appendChild(li);
    })
}

function newElemCard(cardName, cardValue){
    let cardSet = document.getElementById("cardSet");
    let li = newElem(cardSet, "li","voting-card");
    li.innerHTML = "<btn>"+cardName+"</btn>";
    li.setAttribute("data-chosen", "0");
    li.onclick = () => {
        console.log(li.getAttribute("data-chosen"))
        if (li.getAttribute("data-chosen") === "0"){
            sendCmd("="+cardValue);
            $( "#cardSet li" ).each(function() {
                $(this).removeClass('voted');
                this.setAttribute("data-chosen", "0");
            });
            li.setAttribute("data-chosen", "1");
            li.className = "voting-card voted";
        }else{
            sendCmd("=0");
            li.setAttribute("data-chosen", "0");
            li.className = "voting-card";
        }
    }
    return li;
}

function newElemPlayer(name, vote){
    let northBench = document.getElementById("north");
    let southBench = document.getElementById( "south" );
    let westBench = document.getElementById( "west" );
    let eastBench = document.getElementById( "east" );

    let bench;
    let playersCount = players.size;
    if (playersCount >= 0 && playersCount < 6){
        if (playersCount % 2 === 1)
            bench = southBench;
        else
            bench = northBench;
    }else if (playersCount < 10){
        if ((playersCount-6)%2 === 1)
            bench = eastBench;
        else
            bench = westBench;
    }else {
        if ((playersCount - 10) % 2 === 1)
            bench = southBench;
        else
            bench = northBench;
    }


    let playerSeat = newElem(bench, "div", "player-seat");
    let playerCard = newElem(playerSeat, "div", "player-card");
    let playerName = newElem(playerSeat, "div", "player-name");
    playerName.innerHTML = name;
    if (+vote > 0){
        playerSeat.className += " card-voted";
    }

    return playerSeat;
}

function setConnected(connected) {
    // $("#connect").prop("disabled", connected);
    // $("#disconnect").prop("disabled", !connected);
    if (connected) {
        $("#casino").show();
        $("#cardSet").show();
        $("#welcome").hide();
    }
    else {
        $("#casino").hide();
        $("#cardSet").hide();
        $("#welcome").show();
    }
}


function connect(username) {
    var socket = new SockJS('/stomp-endpoint');
    stompClient = Stomp.over(socket);
    stompClient.connect({}, function (frame) {
        setConnected(true);
        console.log('Connected: ' + frame);
        stompClient.subscribe('/topic/casinos', function (casino) {
            processMessage(JSON.parse(casino.body));
        });

        var sessionId = /\/([^\/]+)\/websocket/.exec(socket._transport.url)[1];
        console.log("Session ID: " + sessionId);

        // Subscribe to an individual destination
        var individualDestination = '/queue/individual/' + sessionId;
        stompClient.subscribe(individualDestination, function(message) {
            var body = JSON.parse(message.body);
            processMessage(body);

            // Process the received message as needed
        });
        sendCmd("+"+username);
        setTimeout(function() {sendCmd("?");}, 200);
    });
}


function disconnect() {
    if (stompClient !== null) {
        stompClient.disconnect();
    }
    setConnected(false);
    console.log("Disconnected");
}

function sendCmd(cmd) {
    stompClient.send("/app/speak", {}, JSON.stringify({'message': cmd}));
}


function processMessage(envelope) {
    //todo: process Message
    let rawMessage = envelope.message;
    let type = rawMessage.substring(0,1);
    let mssg = rawMessage.substring(1);
    switch (type) {
        case "&":catchUp(mssg);break;
        case "+":addPlayer(mssg);break;
        case "-":delPlayer(mssg);break;
        case "$":playerVoted(mssg);break;
        case ".":playerUnvoted(mssg);break;
        case "*":revealVotes(mssg);break;
        case "%":resetVotes();break;
        default:;
    }
}

function catchUp(mssg){
    let playersList = mssg.split("&&");
    playersList.forEach(player => {
        let plyr = player.split("++");
        if (players.has(plyr[0])){
            players.get(plyr[0]).vote = plyr[2];
        }else{
            players.set(plyr[0], new Player(plyr[0], plyr[1], plyr[2]));
        }
    })
}

function revealVotes(mssg){
    let allEmpty = true;
    let playersList = mssg.split("&&");
    let avgList = [];
    playersList.forEach(player => {
        let plyr = player.split("++");
        if (plyr[2]!=="0") {
            allEmpty = false;
            avgList.push(+plyr[2]);
        }
        if (players.has(plyr[0])){
            players.get(plyr[0]).vote = plyr[2];
            players.get(plyr[0]).updateCard(plyr[2]);
        }else{
            players.set(plyr[0], new Player(plyr[0], plyr[1], plyr[2]));
            players.get(plyr[0]).updateCard(plyr[2]);
        }
    })
    if (!allEmpty){
        let avg = calculateAverage(avgList);
        $( "#reset" ).show();
        $( "#reveal" ).hide();
        $( "#cardSet" ).hide();
        $( "#average" ).html(avg);
        $( "#results" ).show();
    }
}

function addPlayer(mssg) {
    let plyr = mssg.split("++");
    if (players.has(plyr[0])){
        players.get(plyr[0]).vote = plyr[2];
    }else{
        players.set(plyr[0], new Player(plyr[0], plyr[1], plyr[2]));
    }
}

function delPlayer(mssg) {
    if (players.has(mssg)){
        let elem = players.get(mssg).elem;
        elem.remove();
        players.delete(mssg);
    }
}

function playerVoted(mssg){
    if (players.has(mssg)){
        players.get(mssg).voted();
    }
}

function playerUnvoted(mssg){
    if (players.has(mssg)){
        players.get(mssg).unvoted();
    }
}

function resetVotes(){
    $( "#reset" ).hide();
    $( "#reveal" ).show();
    $( "#cardSet" ).show();
    $( "#results" ).hide();
    players.forEach((value, key) => {
        value.updateCard("");
    })
    $( "#cardSet li" ).each(function() {
        $(this).removeClass('voted');
        this.setAttribute("data-chosen", "0");
    });
}











function newElem(eltern, tagname, classname) {
    let newElement = document.createElement(tagname);
    if (classname) {
        newElement.className = classname;
    }
    eltern.appendChild(newElement);
    return newElement;
}

function calculateAverage(numbers) {
    const sum = numbers.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
    const average = sum / numbers.length;
    const roundedAverage = average.toFixed(1);
    return parseFloat(roundedAverage);
}

$(function () {
    setup()
    $( "#connect" ).click(function() {
        let nameVoter = $("#nameVoter").val();
        nameVoter.length>0 ? connect(nameVoter):alert("enter name");
    
    });
    $( "#reveal" ).click(function() {
        sendCmd("*");
    })
    $( "#reset" ).click(function() {
        sendCmd("%");
    })

});