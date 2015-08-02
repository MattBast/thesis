$(document).ready( function() {
	$("#left-menu").sidr({
		name: "sidr-left",
		side: "left",
		source: "#left-content"
	});
	$("#right-menu").sidr({
		name: "sidr-right",
		side: "right",
		source: "#right-content"
	});
});