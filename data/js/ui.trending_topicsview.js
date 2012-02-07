if (typeof ui == 'undefined') var ui = {};
ui.TrendingTopicsView = {

init:
function init() {
    var btns = new widget.RadioGroup('#trend_topics_radio_group');
    btns.on_clicked = function (btn, event) {
        // activate another sub page.
        ui.TrendingTopicsView.current = $(btn).attr('href');
        toast.set("Loading Tweets...").show(-1);
    };
    btns.create();
},

init_view:
function init_view(view) {
    var toggle = view._header.find('.trending_topics_view_toggle');
    var sub_view_btns = toggle.find('.radio_group_btn');
    sub_view_btns.click(function (event) {
        var pagename = $(this).attr('href').substring(1);
        sub_view_btns.removeClass('selected');
        $(this).addClass('selected');
        ui.TrendingTopicsView.switch_sub_view(view, pagename);
    });
},

get_trending_topics_local:
function get_trending_topics_local(view, success, fail) {
    $.get('http://loc4lizer.heroku.com/localize.json', function(data) {
       $('.trending_topics_local').html('Local (' + data.geo.country_name + ')');
       lib.twitterapi.get_trending_topics_local(success); 
    });
    return 1; // There are always trend topics
},

get_trending_topics_worldwide:
function get_trending_topics_worldwide(view, success, fail) {
    lib.twitterapi.get_trending_topics_worldwide(success);
    return 1; // There are always trend topics
},

get_trending_topics_success:
function get_trending_topics_success(self, json) {
    var trend_list = json[0].trends;
    for (trend_name in trend_list) {
        var m = ui.Template.trending_topic_m;
        m.ID = trend_list[trend_name].name;
        self._body.append(ui.Template.render(ui.Template.trending_topic_t, m));
    }
},

switch_sub_view:
function switch_sub_view(view, name) {
    switch (name) {
    case 'trending_topics_local':
        view._load = ui.TrendingTopicsView.get_trending_topics_local;
    break;
    case 'trending_topics_worldwide':
        view._load = ui.TrendingTopicsView.get_trending_topics_worldwide;
    break;
    default: break;
    }
    view.clear();
    view.load();
},

};
