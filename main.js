(function(){
    'use strict';
    var h = $("<div>").appendTo($("body")).css({
        "text-align": "center",
        padding: "1em"
    });
    function addBtn(title, func, parentNode){
        return $("<button>").text(title).click(func).appendTo(parentNode||h);
    }
    $("<h1>",{text:"クッキー☆語録自動生成スクリプト"}).appendTo(h);
    $("<div>",{text:"使用する語録を選んで作成ボタンを押してください。"}).appendTo(h);
    h.append("<br>");
    $("<h2>",{text:"1.ジャンルを選択"}).appendTo(h);
    var h_select_kind = $("<div>").appendTo(h);
    h.append("<br>");
    $("<h2>",{text:"2.役名を選択"}).appendTo(h);
    addBtn("選択を反転", function(){
        h_select_name.find("button").click();
    });
    var h_select_name = $("<div>").appendTo(h);
    $("<h2>",{text:"3.生成方法を選択"}).appendTo(h);
    var h_ui = $("<div>").appendTo(h);
    h.append("<br>");
    var h_result = $("<div>").appendTo(h);
    //---------------------------------------------------------
    function makeMarkov(split_func, multiple){ // マルコフ連鎖を作る
        multiple = multiple || 1;
        var data = {};
        var names = [];
        function add(name, text){ // データ登録
            if(names.indexOf(name) === -1) names.push(name);
            var array = split_func(text);
            [].concat(null, array, null).forEach(function(v,i,a){
                //break
                var next_num = i + multiple;
                if(next_num >= a.length) return;
                //prev
                var prev = '', correct = 0; // 補正値
                if(v === null){ // 始端の場合
                    prev = null;
                    correct = multiple - 1;
                }
                else {
                    for(var o = 0; o < multiple; o++) {
                        var now = a[i + o];
                        prev += now;
                    }
                }
                //next
                var next = '';
                for(var p = 0; p < multiple; p++) {
                    var now2 = a[i + p + multiple - correct];
                    if(!now2){ // 終端のnullに触れた場合
                        if(!data[next]) data[next] = [];
                        data[next].push(null);
                        break;
                    }
                    next += now2;
                }
                // finish
                if(!data[prev]) data[prev] = [];
                data[prev].push(next);
            });
        }
        function make(){ // マルコフ連鎖でつなげた文を返す
            var result = '';
            var word = yaju1919.randArray(data[null]);
            while(word) {
                result += word;
                word = yaju1919.randArray(data[word]);
            }
            return [yaju1919.randArray(names), result];
        }
        return {
            add: add,
            make: make
        };
    }
    //---------------------------------------------------------
    var timeoutID = []; // サーバーの負荷を減らす
    function getResource(update_flag){ // 素材を手に入れる
        while(timeoutID.length) clearTimeout(timeoutID.pop());
        resource_URL_list.forEach(function(v,i){
            var id = setTimeout(function(){
                $.get("resource/" + v, function(data){
                    setDB(v,data);
                    yaju1919.save(v, data);
                });
            },3000*i);
            timeoutID.push(id);
            if(update_flag) return;
            yaju1919.load(v, function(data){
                clearTimeout(id);
                setDB(v,data);
            });
        });
    }
    //---------------------------------------------------------
    var DB = {},
        brackets = {
            '「': '」',
            '（': '）',
            '(': ')'
        },
        select = {};
    function makeID(str){
        return 'a' + yaju1919.encode(str);
    }
    function setDB(url,str){
        var ar = url.split('/');
        var kind = ar[0],
            title = ar[1];
        //--------------------------------------
        var hideArea = $('#' + makeID(kind));
        if(!hideArea.get(0)){
            yaju1919.addHideArea(h_select_kind,{
                title: kind,
                id2: makeID(kind),
            });
            hideArea = $('#' + makeID(kind));
            h_select_kind.append("<br>");
        }
        (function(){
            if(select[title]) return;
            var flag = false;
            select[title] = yaju1919.addInputBool(hideArea,{
                title: title,
                change: function(){
                    if(flag) updateSelectName();
                    else flag = true;
                }
            });
        })();
        //--------------------------------------
        str.split('\n').filter(function(v){
            return v.trim().length;
        }).forEach(function(v){
            var min = yaju1919.min(Object.keys(brackets).map(function(v2){
                return (v + v2).indexOf(v2);
            }));
            if(min > v.length) return;
            var name = v.slice(0,min).trim();
            if(name === '' || name.length > 10) return;
            var key = v[min];
            var last = v.lastIndexOf(brackets[key]);
            if(last === -1) return;
            var text = key + v.slice(min + 1, last).trim() + brackets[key];
            //---------------------------------------------------------
            if(!DB[title]) DB[title] = {};
            if(!DB[title][name]) DB[title][name] = [];
            DB[title][name].push(text);
            //---------------------------------------------------------
        });
    }
    var select_name;
    function updateSelectName(){
        select_name = {};
        h_select_name.empty();
        for(var k in select){
            if(!select[k]()) continue;
            for(var v in DB[k]){
                if(select_name[v]) continue;
                select_name[v] = yaju1919.addInputBool(h_select_name,{
                    title: v,
                });
            };
        }
    }
    //---------------------------------------------------------
    var select_arg = yaju1919.addSelect(h_ui,{
        title: "文生成アルゴリズム",
        list: {
            "ランダム": '1',
            "順番": '2',
            "マルコフ連鎖": '3',
        },
        change: function(v){
            if(!v.length) return;
            if(v === '2') $("#order").parent().show();
            else $("#order").parent().hide();
            if(v === '3') h_markov.show();
            else h_markov.hide();
        }
    });
    var inputNumberOrder = yaju1919.addInputNumber(h_ui,{
        id: "order",
        title: "順番",
        min: 0,
    });
    $("#order").parent().hide();
    var h_markov = $("<div>").appendTo(h_ui).hide();
    var inputNumberMultiple = yaju1919.addInputNumber(h_markov,{
        title: "多重マルコフ連鎖",
        min: 1,
    });
    var select_arg_split = yaju1919.addSelect(h_markov,{
        title: "品詞分解アルゴリズム",
        list: {
            "文字数ごとに分割": '1',
            "文字種ごとに分割": '2',
            "形態素解析": '3',
        },
        change: function(v){
            if(v === '1') $("#split").parent().show();
            else $("#split").parent().hide();
        }
    });
    var inputNumberSplit = yaju1919.addInputNumber(h_markov,{
        id: "split",
        title: "分割する文字数",
        value: 2,
        min: 1,
        max: 99,
    });
    $("#split").parent().hide();
    var activFunc; // 現在稼働している関数
    window.DB = DB; // for debug
    function make(){
        var ar = [];
        window.ar = ar; // for debug
        for(var k in select){
            if(!select[k]()) continue;
            for(var v in select_name){
                if(!select_name[v]()) continue;
                var texts = DB[k][v];
                if(!texts) continue;
                ar.push([v, texts]); // 役名, 語録
            }
        }
        var arg = select_arg();
        if(['1','2'].indexOf(arg)!==-1){
            var arr = [];
            ar.forEach(function(v){
                v[1].forEach(function(text){
                    arr.push(v[0] + text);
                });
            });
            if(arg === '1'){ // ランダム
                activFunc = function(){
                    return yaju1919.randArray(arr);
                };
            }
            else if(arg === '2'){ // 順番
                $("#order").val('0');
                activFunc = function(){
                    var next = inputNumberOrder() + 1;
                    var order = next % arr.length;
                    $("#order").val(String(order));
                    return arr[order];
                };
            }
            return true; // 作成完了
        }
        else if(arg === '3'){ // マルコフ連鎖
            var markov = makeMarkov((function(){
                var arg_split = select_arg_split();
                if(arg_split === '1'){ // 文字数ごと
                    return function(str){ return WA_KA_CHI_GA_KI(str, inputNumberSplit()); };
                }
                else if(arg_split === '2'){ // 文字種ごと
                    return function(str){ return WA_KA_CHI_GA_KI(str); };
                }
                else if(arg_split === '3'){ // 形態素解析
                    var segmenter = new TinySegmenter();
                    return function(str){ return segmenter.segment(str); };
                }

            })(), inputNumberMultiple());
            ar.forEach(function(v){ // クッソ時間かかる処理
                v[1].forEach(function(text){
                    markov.add(v[0],text);
                });
            });
            activFunc = function(){
                return markov.make().join('');
            };
            return true; // 作成完了
        }
    }
    $("<h2>",{text:"4.モデルを作成"}).appendTo(h_ui);
    addBtn("この内容で文生成モデルを作成", function(){
        $(document.body).css({cursor: "wait"});
        h_result.text("モデル作成中...");
        try{
            var result = make();
            if(result) h_result.text("モデルの作成が完了しました。");
            else h_result.text("原因不明のエラーです。");
        }
        catch(err){
            $("<div>").appendTo(h_result.empty()).text("モデルの作成に失敗しました。").css({
                color: "red",
                backgroundColor: "pink"
            });
            $("<div>").appendTo(h_result).text(err);
        }
        $(document.body).css({cursor: "auto"});
    }, h_ui);
    $("<h2>",{text:"5.文生成"}).appendTo(h_ui);
    addBtn("文生成", function(){
        if(!activFunc) return h_result.text("文生成モデルがありません。");
        yaju1919.addInputText(h_result.empty(),{
            title: "output",
            value: activFunc(),
            readonly: true,
        });
    }, h_ui);
    var resource_URL_list = [
        "クッキー☆/魔理沙とアリスのクッキーKiss",
        "クッキー☆/旧クリスマス企画",
        "クッキー☆/お正月企画",
        "クッキー☆/新クリスマス企画",
        "クッキー☆/クッソー☆",
        "クッキー☆/クッソー☆☆",
        "クッキー☆/霊夢と魔理沙のチョコレート★ハート",
        "クッキー☆/メッモー☆",
        "クッキー☆/クラウンピースと小さな勇気",
        "クッキー☆/カス☆",
        "クッキー☆/鍋パーティ",
        "クッキー☆/クッキー☆☆☆",
        "クッキー☆/魔理沙さんのスペルカードを探せ！",
        "クッキー☆/再翻訳クッキー☆",
        "クッキー☆/UDKとRUの確執",
        "クッキー☆/シアトル・マリナーズは関係ないだろ",
        "クッキー☆/イワナ",
        "クッキー☆/HSI姉貴こえ部音声まとめ.mp138",
        "クッキー☆/魔理沙とアリスと根菜のゴルゴンゾーラ和え",
        "淫夢/第一章「極道脅迫！体育部員たちの逆襲」",
        "淫夢/第二章「モデル反撃！犯されるスカウトマン」",
        "淫夢/第四章「昏睡レイプ！野獣と化した先輩」",
        "淫夢/ザ・フェチ Vol.3 フェチシリーズ初心者編",
        "淫夢/BABYLON STAGE 17 ストーカー 異常性愛 第一章",
        "淫夢/BABYLON STAGE 27 誘惑のラビリンス 第三章「空手部・性の裏技」",
        "淫夢/BABYLON STAGE 31 罪と× 第五章「青少年更生施設」",
        "淫夢/悶絶少年 其の伍 少年拉致強姦",
        "淫夢/職場淫猥白書8 ピザ配達員豊田編（かじられて欠けたピザ）",
        "淫夢/職場淫猥白書9 料理人解体ショー",
        "淫夢/職場淫猥白書9 赤城不動産編",
        "淫夢/職場淫猥白書13 寿司職人見習い編",
        "ハセカラ/絶叫脱糞",
        "エア本/すばらしきわが人生Parn2",
        "エア本/すばらしきわが人生Parn4",
        "エア本/Future2",
        "Syamu_game/Amazonで車載マウントを買ってみた！",
        "Syamu_game/【Syamu】YouTuberを夢見る30歳無職に色々聞いてみた【人間観察】",
        "Syamu_game/【非リア充の俺が】僕と君の夏休み：実況プレイ！パート１～８",
        "Syamu_game/ウォンツお客様インタビュー：浜崎順平さん",
        "Syamu_game/カツカレー炒飯作ってみた！",
        "Syamu_game/初めての質問返答！",
        "Syamu_game/怪異症候群：実況プレイ！１",
        "Syamu_game/第一回オフ会のお知らせ！",
        "Syamu_game/第一回オフ会：２０１４年８月１１日",
        "Syamu_game/自分の動画が、ニコニコ動画に無断転載された・・・",
        "チャージマン研！/01話 危機！！子供宇宙ステーション",
        "チャージマン研！/02話 危機一髪！！",
        "チャージマン研！/03話 蝶の大群が舞う",
        "チャージマン研！/04話 謎の美少年",
        "チャージマン研！/16話 殺人レコード 恐怖のメロディ",
        "チャージマン研！/23話 恐怖！精神病院",
        "チャージマン研！/25話 雄一少年を救え！",
        "aiueo700/アシッドミルクおじさん回",
        "aiueo700/午前６時５０分に警察が公務執行妨害の家宅捜索令状と逮捕状を持って家に来ました",
        "aiueo700/平成29年5月28日今日の集団ストーカー　夜中に玄関の横のドアから中に入ろうとした女を捕まえて110番したら江南警察に事件じゃないといわれました",
        "aiueo700/杉本和巳前衆議院議員の選挙カーを撮ったら秘書に追いかけられました",
        "aiueo700/検事に高校生が首に腕を回して逮捕したと認めなければ厳しい処罰でのぞむといわれました1-2",
        "aiueo700/覆面を被った不審者に不法侵入され捕まえようとしたら暴行の容疑者にされ警察署に連行されました",
        "aiueo700/覆面警官がチャイムを鳴らしておびきだしてデッチ上げ警察が近くに隠れて事件が起きるのを待っていました",
        "aiueo700/隣家の集団ストーカーにベランダから唾を吐いたら親子で乗り込んできました",
        "aiueo700/集団ストーカーに住居侵入され自転車を逆さまにしたり牛乳をぶちまけたりされたから捕まえたら暴行罪をでっち上げられました",
        "aiueo700/２階のひさしの下に防犯カメラを取り付けたら２日で集団ストーカーに盗まれました",
    ];
    getResource();
})();
