var kismet = {

    OP_ATOM:0,
//unary operator
    OP_NOT: 1,      // !
//binary operator
    OP_EQ:  2,      // == 
    OP_NEQ: 3,      // !=
    OP_TEQ: 4,      // ===
    OP_GT:  5,      // >
    OP_LT:  6,      // <
    OP_GE:  7,      // >=
    OP_LE:  8,      // <=
//string operator
    OP_STR_HAS: 11,
    OP_STR_STARTSWITH: 12,
    OP_STR_ENDSWITH: 13,
//re operator
    OP_REG_TEST: 14,
// misc
    OP_HASH_HAS: 15,
    OP_MENTION_HAS: 16,
    OP_HAS_GEO: 17,
    OP_HAS_LINK: 18,

    ACT_DROP: 100,
    ACT_NOTIFY: 101,
    ACT_MASK: 102,
    ACT_ARCHIVE: 103,
    ACT_REPLY: 104,
    ACT_QUOTE: 105,
    
    TYPE_WORD: 200,
    TYPE_STR: 201,
    TYPE_RE: 202,
    TYPE_LBRA: 203,
    TYPE_RBRA: 204,
    TYPE_COLON: 205,

    act_code_map: [],

    MASK_TEXT: '******** Masked Text Field ********',

    reserved_words: ['has', 'name', 'tag', 'via', 'do'],

    rules: [],

    enforcers: [],

/* 
   condition express:
    cond_exp := [op, arg_list]
    op := OP_BLAH
    arg := cond_exp | true | false
    grammar: [OP ARG_LIST]
    text example: 
   
   action express:
    act_exp := [act, arg_list]
    act := ACT_BLAH
    arg := String | Number | Boolean
 */

/*
    enforcer = {
        name: name,
        cond: cond_exp,
        action: [act_exp, act_exp, ... act_exp]
    } 

    text:
    $rule := $field $field $field ...
    $field := $keyword | $field_key:$field_value
    $keyword := "[all char]+" | [all char without \s and :]+
    $field_key := source | user | retweeter | tag | do 
    $field_value := "[all char]+" | [all char without \s, \\ and : ]+ 
                | /[all char]+/i*
    
 */
init:
function init() {
    kismet.act_code_map = [kismet.ACT_DROP, kismet.ACT_NOTIFY, kismet.ACT_MASK, kismet.ACT_ARCHIVE, kismet.ACT_REPLY, kismet.ACT_QUOTE];
},

load:
function load() {
    var active_profile = conf.get_current_profile();
    kismet.rules = active_profile.preferences.kismet_rules;
    if (kismet.rules.constructor != Array) {
        kismet.rules = [];
    }
    kismet.enforcers = [];
    for (var i = 0; i < kismet.rules.length; i += 1) {
        kismet.update_rule(kismet.rules[i]);
    }
},

save:
function save() {
    if (typeof conf != 'undefined') {
    conf.get_current_profile().preferences.kismet_rules = kismet.rules;
    conf.save_prefs(conf.current_name);
    }
},

update_rule:
function update_rule(rule) {
    var notfound = true;
    for (var i = 0; i < kismet.rules.length; i += 1) {
        if (kismet.rules[i].name == rule.name) {
            kismet.rules[i] = rule;
            notfound = false;
            break;
        }
    }
    if (notfound) {
        kismet.rules.push(rule);
    }
    notfound = true;
    var rule_cc = kismet.compile(rule.data);
    rule_cc.name = rule.name;
    for (var i = 0; i < kismet.enforcers.length; i += 1) {
        if (kismet.enforcers[i].name == rule_cc.name) {
            kismet.enforcers[i] = rule_cc;
            notfound = false;
            break;
        }
    }
    if (notfound) {
        kismet.enforcers.push(rule_cc);
    }
},

remove_rule:
function remove_rule(name) {
    for (var i = 0; i < kismet.rules.length; i += 1) {
        if (kismet.rules[i].name == name) {
            kismet.rules.splice(i, 1);
            break;
        }
    }        
    for (var i = 0; i < kismet.enforcers.length; i += 1) {
        if (kismet.enforcers[i].name == name) {
            kismet.enforcers.splice(i, 1);
            break;
        }
    }  
},


eval_bool_exp:
function eval_bool_exp (exp, incoming) {
    if (!exp) return false;
    if (exp[0] === kismet.OP_ATOM) {
        return exp[1];
    }
    var t0 = null; var t1 = null;
    var vholder = null;
    var arg0 = exp[1] || false;
    var arg1 = exp[2] || false;
    // console.log('eval:', exp[0],':', arg0,',' ,arg1)
    if (arg0.constructor == String && arg0[0] == '$') {
        t0 = kismet.get_holder_value(arg0, incoming);
    } else {
        t0 = arg0;
    } 
    if (arg1.constructor == String && arg1[0] == '$') {
        t1 = kismet.get_holder_value(arg1, incoming);
    } else {
        t1 = arg1;
    }
    // console.log('eval:', exp[0],':', t0,',' ,t1)
    switch (exp[0]) {
    case kismet.OP_NOT:
        return (!t0);
    break;
    case kismet.OP_EQ:
        return (t1 == t0); 
    break;
    case kismet.OP_NEQ:
        return (t1 != t0); 
    break;
    case kismet.OP_TEQ:
        return (t1 === t0); 
    break;
    case kismet.OP_GT:
        return (t0 > t1);
    break;
    case kismet.OP_LT:
        return (t0 < t1);
    break;
    case kismet.OP_GE:
        return (t0 >= t1);
    break;
    case kismet.OP_LE:
        return (t0 <= t1);
    break;
    case kismet.OP_STR_HAS:
        return (t0.indexOf(t1) != -1);
    break;
    case kismet.OP_STR_STARTSWITH:
        return (t0.indexOf(t1) == 0);
    break;
    case kismet.OP_STR_ENDSWITH:
        return (t0.lastIndexOf(t1) == (t0.length - t1.length));
    break;
    case kismet.OP_REG_TEST:
        return t0.test(t1);
    break;
    case kismet.OP_HASH_HAS:
        return (t0.indexOf(t1) != -1);
    break;
    case kismet.OP_MANTION_HAS:
        return (t0.indexOf(t1) != -1);
    break;
    case kismet.OP_HAS_GEO:
        return (t0);
    break;
    case kismet.OP_HAS_LINK:
        return (t0.length != 0);
    break;
    }
    return false;
},

eval_cond:
function eval_cond(cond, incoming) {
    if (cond.length == 1) {
        return kismet.eval_bool_exp(cond[0], incoming);
    } else {
        return cond.reduce(function (a, b) {
            return kismet.eval_bool_exp(a, incoming) && kismet.eval_bool_exp(b, incoming);
        });
    }
},

do_action:
function do_action(rule, incoming) {
    var ret = true;
    for (var i = 0; i < rule.action.length; i += 1) {
        var act = rule.action[i];
        switch (act[0]) {
        case kismet.ACT_DROP:
            kismet.do_drop(rule, act,  incoming);
            ret = false;
        break;
        case kismet.ACT_MASK:
            kismet.do_mask(rule, act, incoming);
        break;
        case kismet.ACT_NOTIFY:
            kismet.do_notify(rule, act, incoming);
        break;
        case kismet.ACT_ARCHIVE:
            kismet.do_archive(rule, act, incoming);
        break;
        case kismet.ACT_REPLY:
            kismet.do_reply(rule, act, incoming);
        break;
        case kismet.ACT_QUOTE:
            kismet.do_quote(rule, act, incoming);
        break;
        }
    }
    return ret;
},

do_drop:
function do_drop(rule, act, incoming) {
    console.log('[ACT]', 'Drop the incoming!');
},

do_notify:
function do_notify(rule, act, incoming) {
    var user = incoming.hasOwnProperty('user')? 
            incoming.user: incoming.sender;
    hotot_notify(user.screen_name, incoming.text
        , user.profile_image_url , 'content');
},

do_archive:
function do_archive(rule, act, incoming) {
    console.log('[ACT]','Archive the incoming!');
    var formal_name = encodeBase64(rule.name).replace(/=/g, '_');
    if (!ui.Main.views.hasOwnProperty('kismet_' + formal_name)) {
        ui.Slider.add('kismet_'+ formal_name, 
          {title:'Kismet # ' + rule.name, icon:'image/ic_archive.png'}
        , { 'type':'tweet', 'title': 'Kismet # '+ rule.name
            , 'load': null 
            , 'loadmore': null
            , 'load_success': ui.Main.load_tweet_success
            , 'load_fail': null
            , 'loadmore_success': null
            , 'loadmore_fail': null
            , 'former': ui.Template.form_tweet
            , 'destroy': function destroy(view) {
                ui.Slider.remove(view.name);
            }
            , 'method': 'poll'
            , 'interval': -1
            , 'item_type': 'id'
        });
        ui.Slider.slide_to(ui.Slider.current);
    }
    ui.Main.views['kismet_' + formal_name].load_success([incoming]);
},

do_reply:
function do_reply(rule, act, incoming) {
    console.log('[ACT]', 'Make a response!');
    var user = incoming.hasOwnProperty('user')? 
            incoming.user: incoming.sender;
    if (typeof globals != 'undefined' &&
        user.screen_name != globals.myself.screen_name) {
        reply_tweet(incoming.id_str, '@'+user.screen_name + ' ' + act[1]); 
    }
},

do_quote:
function do_quote(rule, act, incoming) {
    console.log('[ACT]', 'Make a quote!');
    var user = incoming.hasOwnProperty('user')? 
            incoming.user: incoming.sender;
    if (typeof globals != 'undefined' &&
        user.screen_name != globals.myself.screen_name) {
        update_status(act[1] + ' RT @' + user.screen_name + ':'+ incoming.text); 
    }
},

do_mask:
function do_mask(rule, act, incoming) {
    incoming.text = kismet.MASK_TEXT;
    console.log('[ACT]', 'Mask the incoming!');
},

filter_proc:
function filter_proc(single) {
    var ret = true;
    for (var i = 0; i < kismet.enforcers.length; i += 1) {
        if (kismet.eval_cond(kismet.enforcers[i].cond, single)) {
            console.log('Match rule #' + i +' "'+kismet.enforcers[i].name+'" @', single);
            ret = kismet.do_action(kismet.enforcers[i], single);
            if (!ret) break;
        }
    } 
    return ret;
},

filter:
function filter(incoming) {
    return incoming.filter(kismet.filter_proc);
},

get_holder_value:
function get_holder_value(name, tweet) {
    var user = tweet.hasOwnProperty('user')? tweet.user:
                tweet.hasOwnProperty('sender')?tweet.sender: null;
    switch(name) {
    case '$NAME':
        return user?user.screen_name:'';
    break;
    case '$TEXT':
        return tweet.text;
    break;
    case '$SOURCE':
        if (tweet.source)
            return tweet.source.replace(/<.*?>/g, '');
        else
            return '';
    break;
    case '$HASHTAGS':
        if (tweet.entities && tweet.entities.hashtags)
            return tweet.entities.hashtags.map(function (t) {return t.text});
        else
            return [];
    break;
    case '$MENIONS':
        if (tweet.entities && tweet.entities.user_mentions)
            return tweet.entities.user_mentions.map(function(t){return t.screen_name});
        else
            return [];
    break;
    case '$LINKS':
        if (tweet.entities && tweet.entities.urls)
            return tweet.entities.urls.map(function(t){return t.expanded_url});
        else
            return [];
    break;
    case '$GEO':
        return tweet.geo;
    break;
    default:
        return name;
    break;
    }
},

process_action:
function process_action(tokens, pos) {
    switch (tokens[pos][1]) {
    case 'drop':
        return [[kismet.ACT_DROP], 3];
    break;
    case 'mask':
        return [[kismet.ACT_MASK], 3];
    break;
    case 'notify':
        return [[kismet.ACT_NOTIFY], 3];
    break;
    case 'archive':
        return [[kismet.ACT_ARCHIVE], 3];
    break;
    case 'reply':
        if (tokens.length < pos + 3 &&
            tokens[pos + 1][0] != kismet.TYPE_LBRA && 
            tokens[pos + 3][0] != kismet.TYPE_RBRA && 
            tokens[pos + 2][0] != kismet.TYPE_STR) {
            return [[kismet.OP_STR_HAS, '$TEXT', 'do:'+tokens[pos]],3];
        }
        return [[kismet.ACT_REPLY, tokens[pos + 2][1]], 6];
    break;
    case 'quote':
        return [[kismet.ACT_QUOTE, tokens[pos + 2][1]], 6];
    break;
    default:
        return [kismet.OP_STR_HAS, "$TEXT", 'do:'+tokens[pos][1], 3];
    break;
    }
},

process_value:
function process_value(val) {
    if (val.length < 3) {
        return val;
    } else {
        if (/^".+"$/.test(val)) {
            return val.slice(1, val.length - 1);
        } else if (/^\/.*\/i?$/.test(val)) {
            return new RegExp(val.slice(1, val.length - 1), val[val.length-1] == 'i'? 'i': ''); 
        } else {
            return val;
        }
    }
},

process_has:
function process_has(tokens, pos) {
    switch (tokens[pos][1]) {
    case 'map':
    case 'geo':
        return [[kismet.OP_HAS_GEO], 3];
    break;
    case 'link':
    case 'url':
        return [[kismet.OP_HAS_LINK], 3];
    break;
    default:
        return [[kismet.OP_STR_HAS, '$TEXT', 'has:'+tokens[pos][1]], 3];
    break;
    }
},

process_field:
function process_field(tokens, pos) {
    var first = tokens[pos], second = null, third = null;
    if (pos + 2 >= tokens.length)
        return [[kismet.OP_STR_HAS, '$TEXT', first[1]], 1];
    if (tokens[pos + 1][0] != kismet.TYPE_COLON) 
        return [[kismet.OP_STR_HAS, '$TEXT', first[1]], 1];
    if (tokens[pos + 2][0] != kismet.TYPE_WORD &&
        tokens[pos + 2][0] != kismet.TYPE_STR &&
        tokens[pos + 2][0] != kismet.TYPE_RE) {
        return [[kismet.OP_STR_HAS, '$TEXT', first[1]], 1];
    }
    second = tokens[pos + 2];
    switch (first[1]) {
    case 'via':
        if (tokens[pos + 2][0] == kismet.TYPE_RE) {
            return [[kismet.OP_REG_TEST, new RegExp(second[1],second[2]), '$SOURCE'], 3];
        } else {
            return [[kismet.OP_TEQ, '$SOURCE', second[1]], 3];
        }
    break;
    case 'do':
        return kismet.process_action(tokens, pos + 2);
    break;
    case 'tag':
        return [[kismet.OP_HASH_HAS, '$HASHTAGS', second[1]], 3];
    break;
    case 'name':
        if (tokens[pos + 2][0] == kismet.TYPE_RE) {
            return [[kismet.OP_REG_TEST, new RegExp(second[1],second[2]), '$NAME'], 3];
        } else {
            return [[kismet.OP_TEQ, '$NAME', second[1]], 3];
        }
    break;
    case 'mention':
        return [[kismet.OP_MANTION_HAS, '$MENIONS',second[1]], 3];
    break;
    case 'has':
        return kismet.process_has(val);
    break;
    default:
        return [[kismet.OP_STR_HAS,'$TEXT', first[1]+':'+second[1]], 3];
    break;
    }
},

recognize_string:
function recognize_string(str, pos) {
    var ch = str[pos];
    var last = ch;
    while (pos < str.length) {
        last = ch;
        ch = str[pos];
        if (ch === '"' && last != '\\') {
            break;
        }
        pos += 1;
    }
    return pos;
},

recognize_re:
function recognize_re(str, pos) {
    var ch = str[pos];
    var last = ch;
    while (pos < str.length) {
        last = ch;
        ch = str[pos];
        if (ch === '/' && last != '\\') {
            break;
        }
        pos += 1;
    }
    return pos; 
},

recognize_keyword:
function recognize_keyword(str, pos) {
    var ch = str[pos];
    var last = ch;
    while (pos < str.length) {
        last = ch;
        ch = str[pos];
        if (/[\s:()]/.test(ch)) {
            break;
        }
        pos += 1;
    }
    return pos; 
},

read_tokens:
function read_tokens(str) {
    // @TODO 
    var token_list = [];
    var pos = 0, end_pos = 0;
    var ch = str[0];
    while (pos < str.length) {
        ch = str[pos];
        if (ch === '"') {
            end_pos = kismet.recognize_string(str, pos + 1);
            token = [kismet.TYPE_STR, str.slice(pos + 1, end_pos)];
            token_list.push(token);
            pos = end_pos + 1;
        } else if (ch === '/') {
            end_pos = kismet.recognize_re(str, pos+1);
            var flag = (/[a-z]/.test(str[end_pos+1]))?str[end_pos+1]:'';
            token = [kismet.TYPE_RE, str.slice(pos + 1, end_pos), flag];
            token_list.push(token);
            pos = end_pos + 1;
            if (flag.length != 0) pos += 1;
        } else if (ch === ' ') {
            pos += 1;
        } else if (/[a-zA-Z]/.test(ch)) {
            end_pos = kismet.recognize_keyword(str, pos);
            token = [kismet.TYPE_WORD, str.slice(pos, end_pos)];
            token_list.push(token);
            pos = end_pos;
        } else if (ch === '(') {
            token_list.push([kismet.TYPE_LBRA, '(']); 
            pos += 1;
        } else if (ch === ')') {
            token_list.push([kismet.TYPE_RBRA, ')']); 
            pos += 1;
        } else if (ch === ':') {
            token_list.push([kismet.TYPE_COLON, ':']); 
            pos += 1;
        } else {
            pos += 1;
        }
    }
    return token_list;
    return str.split(/\s/).filter(function (x) {return x.length != 0;} )
},

compile:
function compile(str) {
    var tokens = kismet.read_tokens(str);
    var field_key = null;
    var field_value = null;
    var inst = null;
    var rule = {name: '', cond: [], action: []};
    var i = 0;
    while (i < tokens.length) {
        var token = tokens[i];
        switch (token[0]) {
        case kismet.TYPE_WORD:
            if (kismet.reserved_words.indexOf(token[1]) == -1) {
                inst = [kismet.OP_STR_HAS, "$TEXT", token[1]];
                i += 1;
            } else {
                ret = kismet.process_field(tokens, i);
                inst = ret[0];
                i += ret[1];
            }
        break;
        case kismet.TYPE_STR:
            inst = [kismet.OP_STR_HAS, "$TEXT", token[1]];
            i += 1;
        break;
        case kismet.TYPE_RE:
            inst = [kismet.OP_REG_TEST, new RegExp(token[1], token[2]), '$TEXT'];
            i += 1;
        break;
        default:
            i += 1;
        break;
        }
        /*
        if (token[0] == '"' && token[token.length-1] == '"') {
            inst = kismet.process_keyword(token.slice(1, a.length-1));
        } else {
            var sep_pos = token.indexOf(':');
            if (sep_pos == -1) {
                inst = kismet.process_keyword(token);
            } else {
                field_key = token.slice(0, sep_pos);
                field_value = kismet.process_value(token.slice(sep_pos + 1));
                inst = kismet.process_field(field_key, field_value);
            }
        }
        */
        if (kismet.act_code_map.indexOf(inst[0]) != -1) {
            rule.action.push(inst);
        } else {
            rule.cond.push(inst);
        }
    }
    // console.log('Compile:', rule)
    return rule;
},

};

/*
function test() {
    kismet.init();
    //test_token();
    var testcases = [
        'fuckgfw do:drop',
        'aiww Here do:mask',
        'via:foursquare do:drop',
        'tag:FuckGFW do:drop',
        'name:shellex do:drop',
        '"A B C" do:drop',
        'Hey do:reply("Hey")',
        'via:"Hotot for Chrome" do:reply("Hey, you are using Hotot!")',
        '/^RT .*$/i do:drop',
        'via:/^Hotot.*$/i do:drop',
    ];
    for (var i = 0; i < testcases.length; i+= 1) {
        kismet.update_rule({name: testcases[i], data: testcases[i]});
        console.log("Rule #"+i+":", testcases[i]);
    }
    console.log(kismet.enforcers); 
    test_filter();
}
function test_token() {
    var testcases = [
        'fuck+gfw do:drop',
        '"A B C" do:mask',
        'K do:mask',
        'Rt mention:shellex do:reply("Hey")',
    ];
    for (var i = 0; i < testcases.length; i+= 1) {
        var ret = kismet.read_tokens(testcases[i]);
        console.log("Rule #"+i+":", ret);
    }

}
function test_filter() {
    console.log('= Filter Test');
    var simple_in = [
            {text: 'fuckgfw!', user: {screen_name:'a'}},
            {text: 'I am Here #FuckGFW', entities:{hashtags:[{text:'FuckGFW'}]}, user: {screen_name:'b'}},
            {text: 'I am Here', user: {screen_name:'shellex'}},
            {text: 'I am Here', source:'foursquare', },
            {text: 'blah blah blah', source:'Hotot for Chrome', },
            {text: 'I am Here, aiww', user: {screen_name:'c'}},
            {text: 'A B C D'},
            {text: 'I am Here, Hey' },
            {text: 'RT @shellex without comment.' },
        ];

    var ret = kismet.filter(simple_in);
    console.log(ret);
}
test();

        */
