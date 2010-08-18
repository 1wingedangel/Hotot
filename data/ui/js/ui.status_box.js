if (typeof ui == 'undefined') var ui = {};
ui.StatusBox = {

reply_to_id: null,

dm_to_id: null,

dm_to_screen_name: '',

MODE_TWEET: 0,

MODE_REPLY: 1,

MODE_DM: 2,

POS_BEGIN: 0,

POS_END: -1,

current_mode: 0,

close_timeout: 10000,

is_closed: true,

init:
function init () {
    
    $('#btn_update').click(
    function(event){
        var status_text = $.trim($('#tbox_status').attr('value'));
        if (status_text.length > 140) {
            ui.Notification.set('Status is over 140 characters').show();
            return;
        }
        if (status_text != globals.status_hint
            && status_text != globals.dm_hint) {
            if (ui.StatusBox.current_mode == ui.StatusBox.MODE_DM) {
                ui.StatusBox.post_message(status_text);
            } else {
                ui.StatusBox.update_status(status_text);
            }
            ui.StatusBox.current_mode = ui.StatusBox.MODE_TWEET;
        }
    });

    $('#btn_clear').click(
    function (event) {
        $('#tbox_status').attr('value', '');
    });
    
    $('#btn_clear_status_info').click(
    function (event) {
        $(this).parent().hide();
        $('#status_info_text').text('');
        ui.StatusBox.change_mode(ui.StatusBox.MODE_TWEET);
        ui.reply_to_id = null;
    });

    $('#status_box').hover(
    function () {
        ui.StatusBox.open();
    }, 
    function () {
        ui.StatusBox.reset_close_countdown_timer();
    }).click(
    function () {
        return false;
    });

    $('#tbox_status').blur(function(){
        if ($(this).attr('value') == '') {
            $(this).attr('value', globals.status_hint)
                .addClass('hint_style');
        }
    }).focus(function(){
        if ($(this).attr('value') == globals.status_hint) {
            $(this).attr('value', '').removeClass('hint_style');
        }
    }).attr('value',globals.status_hint).addClass('hint_style');

    // shortcut binding Ctrl+Enter
    $('#tbox_status').keyup(
    function (event) {
        if (event.ctrlKey && event.keyCode == 13) {
            $('#btn_update').click();
            return false;
        } else {
            ui.StatusBox.update_status_len();
        }
    }).focus(
    function (event) {
        ui.StatusBox.update_status_len();
    });

    $('#status_len').html('0/' + globals.max_status_len);
},

reset_close_countdown_timer:
function reset_close_countdown_timer() {
    window.clearTimeout(ui.StatusBox.close_countdown_timer);
    ui.StatusBox.close_countdown_timer = window.setTimeout(
        ui.StatusBox.close, ui.StatusBox.close_timeout);
},

change_mode:
function change_mode(mode) {
    if (mode == ui.StatusBox.MODE_DM) {
        $('#status_box').addClass('dm_mode');
        $('#bubble_shape').addClass('dm_mode');
        if ($('#tbox_status').attr('value') == globals.tweet_hint)
            $('#tbox_status').attr('value', globals.dm_hint)
        globals.status_hint = globals.dm_hint;
    } else {
        $('#status_box').removeClass('dm_mode');
        $('#bubble_shape').removeClass('dm_mode');
        if ($('#tbox_status').attr('value') == globals.dm_hint)
            $('#tbox_status').attr('value', globals.tweet_hint)
        globals.status_hint = globals.tweet_hint;
    }
    ui.StatusBox.current_mode = mode;
},

update_status:
function update_status(status_text) {
    if (status_text.length != 0) {
        lib.twitterapi.update_status(status_text
            , ui.StatusBox.reply_to_id
            , ui.StatusBox.update_status_cb);
        ui.Notification.set('Updating...').show(-1);
    }
    return this;
},

update_status_cb:
function update_status_cb(result) {
    $('#tbox_status').addClass('hint_style')
        .attr('value', globals.status_hint);
    ui.Notification.set('Update Successfully!').show();
    $('#status_info').hide();
    ui.StatusBox.reply_to_id = null;
    ui.StatusBox.close();
    return this;
},

update_status_len:
function update_status_len() {
    var status_len = $('#tbox_status').attr('value').length;
    if (status_len > globals.max_status_len)
        $('#status_len').css('background-color', '#cc0000');
    else
        $('#status_len').css('background-color', '#22264e');
    $('#status_len').html(status_len + '/' + globals.max_status_len);
    return this;
},

post_message:
function post_message(message_text) {
    if (message_text.length != 0) {
        lib.twitterapi.new_direct_messages(
              message_text
            , ui.StatusBox.dm_to_id
            , ui.StatusBox.dm_to_screen_name
            , ui.StatusBox.post_message_cb);
        ui.Notification.set('Posting...').show(-1);
    }
},

post_message_cb:
function post_message_cb(result) {
    ui.StatusBox.change_mode(ui.StatusBox.MODE_TWEET);
    $('#tbox_status').addClass('hint_style')
        .attr('value', globals.status_hint);
    ui.Notification.set('Post Successfully!').show();
    $('#status_info').hide();
    ui.StatusBox.close();
    return this;
},


append_status_text:
function append_status_text(text) {
    var orig = $('#tbox_status').attr('value');
    if (orig == '' || orig == globals.status_hint 
        || orig == globals.dm_hint) {
        $('#tbox_status').attr('value', text);
    } else {
        $('#tbox_status').attr('value', orig + text);
    }
    $('#tbox_status').removeClass('hint_style');
},

set_status_text:
function set_status_text(text) {
    $('#tbox_status').attr('value', text);
    $('#tbox_status').removeClass('hint_style');
},

set_status_info:
function set_status_info(info) {
    $('#status_info_text').text(info);
},

show:
function show() {
    $('#status_box').show()
},

hide:
function hide() {
    $('#status_box').hide()
},

close:
function close() {
    if (! ui.StatusBox.is_closed) {
        $('#status_ctrl').hide();
        $('#status_info').hide();
        $('#tbox_status').animate({ 
            height: "50px", 
        }
        , 50
        , 'linear'
        , function () {
            $(this).blur();
        });
        ui.StatusBox.is_closed = true;
    }
},

open:
function open(on_finish) {
    window.clearTimeout(ui.StatusBox.close_countdown_timer);
    if (!on_finish) 
        on_finish = function () {$('#tbox_status').focus();};
    if (ui.StatusBox.is_closed) {
        if (ui.StatusBox.current_mode == ui.StatusBox.MODE_REPLY
            || ui.StatusBox.current_mode == ui.StatusBox.MODE_DM) {
            $('#status_info').show();
        }
        $('#tbox_status').animate({ 
            height: "150px", 
        }
        , 50
        , 'linear'
        , on_finish);
        $('#status_ctrl').show();
        ui.StatusBox.is_closed = false;
    } else {
        if (on_finish) on_finish();
    }
},

move_cursor:
function move_cursor(pos) {
    if (typeof pos == 'undefined')
        return;
    if (pos == ui.StatusBox.POS_END) 
        pos = $('#tbox_status').attr('value').length;

    $('#tbox_status').focus();
    var box = $('#tbox_status').get(0);
	if(box.setSelectionRange) {
        // others
		box.setSelectionRange(pos, pos);
	} else if (box.createTextRange) {
        // IE
		var range = box.createTextRange();
		range.collapse(true);
		range.moveEnd('character', pos);
		range.moveStart('character', pos);
		range.select();
	}
},

get_cursor_pos:
function get_cursor_pos(){
	var pos = 0;	
    var box = $('#tbox_status').get(0);
    $('#tbox_status').focus();
	if (document.selection) {
        // IE
		var sel = document.selection.createRange();
		sel.moveStart('character', -box.value.length);
		pos = sel.text.length;
	} else if (box.selectionStart || box.selectionStart == '0') {
    	// others
		pos = box.selectionStart;
    }
	return pos;
},

};



