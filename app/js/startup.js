//returns a node list (accessible much like an array)
var boxes = document.getElementsByClassName( "floatingBox" );
var currentBox = 0;

//the confirm new or existing choice button
var choiceButton = document.getElementById( "choiceButton" );
var choice = document.getElementsByName( "choice" );
choiceButton.addEventListener( "click", clickChoice );

//fade in and out input boxes
var fileInputBox = document.getElementById("fileInputBox");
var numOfNodesBox = document.getElementById("numOfNodesBox");

//get the file name from the file upload button
var fileInput = document.getElementById( "fileInput" );
fileInput.addEventListener( "change", insertButton );

//get the file name from the file upload button
var savedFileInput = document.getElementById( "savedFileInput" );
savedFileInput.addEventListener( "change", insertButton );

//the confirm button on file upload
var fileUploadButton = document.getElementById( "fileUploadButton" );
fileUploadButton.addEventListener( "click", clickUpload );

//the confirm button on file upload
var savedFileUploadButton = document.getElementById( "savedFileUploadButton" );
savedFileUploadButton.addEventListener( "click", clickSavedUpload );

//the variables controlling the loading spinner
var c = document.getElementById( "canvas" );
var ctx = c.getContext( "2d" );
var loading = document.getElementById( "loading" );
var degrees = 0;
var timer;
//-------------- change size of boxes inside container --------------

function setHeight() {
	for( var i = 0; i < boxes.length; i++ ) {
		boxes[i].style.height = $( "#container" ).height() + "px";
	}
}

//------------- slide in and out startup box functions --------------

function slideLeft() {

	//variable to be incremented down
	var position = 100;

	//move box
	var timer = setInterval( function(){
		position -= 1;
		boxes[currentBox].style.left = position + "%";

		if( position === 5 ){
			clearInterval( timer );
		}
	}, 5 );
}

function slideRight() {
	//variable to be incremented down
	var position = 25;

	//move box
	var timer = setInterval( function(){
		position += 1;
		boxes[currentBox].style.left = position + "%";

		if( position === 100 ){
			clearInterval( timer );
			
			//select the now visible
			currentBox--;
		}
	}, 5 );
}

function clickChoice() {
	if( choice[0].checked !== true && choice[1].checked !== true) {
		alert( "Please choose one of the options" );
	}
	else if( choice[0].checked === true ) {
		currentBox = 2;
		slideLeft();
	}
	else {
		currentBox = 1;
		slideLeft();
	}
}

function clickUpload() {
	if( fileInput.files.length === 0 ) {
		alert( "Please select a file first" );
	}
	else {
		currentBox = 3;
		slideLeft();
	}
}

function clickSavedUpload() {
	if( savedFileInput.files.length === 0 ) {
		alert( "Please select a file first" );
	}
	else {
		currentBox = 3;
		slideLeft();
	}
}

function insertButton() {
	if( fileInput.files.length === 0 && savedFileInput.files.length === 0 ) {
		alert( "No file selected" );
	}
	else {
		fileUploadButton.style.opacity = 1;
		savedFileUploadButton.style.opacity = 1;
	}
}

//-------------------- loading spinner functions -------------------

function spin() {
	//display the spinner
	c.style.display = "block";
	loading.style.display = "block";

	//start spinning
	timer = setInterval( turn, 5 );

	//upload the file
	upload(); 
}

function turn() {
	//turn canvas one extra degrees per tick interval
	degrees += 1;
	if( degrees > 360 ) {
		degrees = 0;
	}

	rotate( degrees ); //<-- turn canvas
	drawSpinner(); //<-- draw new spinner circle
}

function rotate( degrees ) {
	ctx.save();
	ctx.clearRect( 0, 0, c.width, c.height );

	ctx.translate( 1000, 200 ); //<-- move rotation point to centre of canvas
	ctx.rotate( degrees*Math.PI/180 ); //<-- rotate canvas
	ctx.translate( -1000, -200 ); //<-- move rotation point back to top left
}

function drawSpinner() {
	//colour and width of line
	ctx.strokeStyle = "#98bf21";
	ctx.lineWidth = 5;

	//draw circle with gap in it
	ctx.beginPath();
	ctx.arc( 1000, 200, 75, 0, 1.8*Math.PI );
	ctx.stroke();
	ctx.restore();
}

function stopSpin() {
	//hide the spinner
	c.style.display = "none";
	loading.style.display = "none";

	//stop spinning the canvas
	clearInterval( timer );
}