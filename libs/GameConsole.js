var GameConsole = function() {

	var scope = this;

	// initialize game console
	var container = document.createElement('div');
	container.id = 'msgDisplay';
	container.style.cssText = 'width:150px;height:100px;opacity:0.7;cursor:url(images/pointer.cur), default;padding:0 0 3px 3px;text-align:left;background-color:transparent';

	container.className = "passthrough";
	container.style.position = 'absolute';
	container.style.left = '13px';
	container.style.top = '13px';

	var gameConsole = document.createElement('div');
	gameConsole.id = 'gameConsole';

	var gameTextDisplay = document.createElement('textarea');
	gameTextDisplay.setAttribute("disabled", true);
	gameTextDisplay.setAttribute("readonly", true);

	// should change these attributes to match size of parent / container
	gameTextDisplay.style.cssText = 'resize:none;width:100%;height:100%;cursor:url(images/pointer.cur), default;overflow:hidden;border: none;color:white;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;background-color:transparent';
	gameTextDisplay.id = 'gameTextDisplay';
	gameTextDisplay.className = "unselectable passthrough";

	gameConsole.appendChild(gameTextDisplay);
	container.appendChild(gameConsole);

	this.GAME_TEXT_DISPLAY = '#gameTextDisplay';

	// slow down jquery animations
	jQuery.fx.interval = 30;

	this.active = true;

	return {
		domElement: container,

		append: function(text) {
			var box = $(scope.GAME_TEXT_DISPLAY);
			box.val(box.val() + text + "\n");
			this.message = box.val();

			box.animate({
				scrollTop: box[0].scrollHeight - box.height()
			}, 700);
		},

		setWidth: function(width) {
			$("#msgDisplay").width(width);
		},

		setHeight: function(height) {
			$("#msgDisplay").height(height);
		}, 

		clear: function() {
			var box = $(scope.GAME_TEXT_DISPLAY);
			box.val("");
			this.message = "";
		}
	}
};
