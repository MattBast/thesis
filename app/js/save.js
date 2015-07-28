var saveButton = document.getElementById( "saveButton" );
saveButton.addEventListener("click", clickSave );

function clickSave() {
	changeColour();
	setTimeout( resetColours, 100 );
}

function changeColour() {
	saveButton.style.backgroundColor = "white";
	saveButton.style.color = "#98bf21";
}

function resetColours() {
	saveButton.style.backgroundColor = "#98bf21";
	saveButton.style.color = "white";
}