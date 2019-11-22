(() => {
  'use strict';
    const yaju1919 = yaju1919_library;
    const segmenter = new TinySegmenter();
    const get = (url, callback) => {
        yaju1919.get(url,{
            success: callback,
            fail: r => console.error(url)
        });
    };
    const rand = yaju1919.rand;
    const makeMarkov = (split_func, multiple = 1) => { // マルコフ連鎖を作る
        let data = {};
        const names = [];
        const add = (name, text) => { // データ登録
            if(names.indexOf(name) === -1) names.push(name);
            let array = split_func(text);
            [].concat(null, array, null).forEach((v,i,a)=>{
                //break
                const next_num = i + multiple;
                if(next_num >= a.length) return;
                //prev
                let prev = '', correct = 0; // 補正値
                if(v === null){ // 始端の場合
                    prev = null;
                    correct = multiple - 1;
                }
                else {
                    for(let o = 0; o < multiple; o++) {
                        let now = a[i + o];
                        prev += now;
                    }
                }
                //next
                let next = '';
                for(let o = 0; o < multiple; o++) {
                    let now = a[i + o + multiple - correct];
                    if(!now){ // 終端のnullに触れた場合
                        if(!data[next]) data[next] = [];
                        data[next].push(null);
                        break;
                    }
                    next += now;
                }
                // finish
                if(!data[prev]) data[prev] = [];
                data[prev].push(next);
            });
        };
        const make = () => { // マルコフ連鎖でつなげた文を返す
            let result = '';
            let word = rand(data[null]);
            while(word) {
                result += word;
                word = rand(data[word]);
            }
            return [rand(names), result];
        };
        return {add:add,make:make};
    };
    let markov;
    //--------------------------------------------------------------------------------------------------------------------------------
    const main = () => {
        if(!first_flag) return;
        const kind = select.kind.f();
        const title = select.title.f();
        const name = select.name.f();
        const mode = select.mode.f();
        if(!(kind&&title&&name&&mode)) return;
        const now = DB[kind][title][name];
        let result;
        let order_n = getOrder_num();
        const order_max = Number(max_elm.text())+1;
        switch(mode){
            case "ランダム取得":
                result = rand(now);
                break;
            case "順番に取り出す":
                if(order_n >= now.length) order_n = 0;
                result = now[order_n];
                order_n++;
                holder_order.find("input").val(order_n >= now.length ? 0 : order_n);
                break;
            default:
                result = markov.make();
                break;
        }
        if(flag_removeBrackets()) result = result[1].slice(1,-1);
        else result = result.join("");
        return result;
    };
    const setMarkov = () => {
        const kind = select.kind.f();
        const title = select.title.f();
        const name = select.name.f();
        const mode = select.mode.f();
        if(!(kind&&title&&name&&mode)) return;
        const now = DB[kind][title][name];
        // 分割方式の設定
        let split_func = s => WA_KA_CHI_GA_KI(s, getMode_num());
        if(/単語/.test(mode)) split_func = s => segmenter.segment(s);
        else if(/文字種/.test(mode)) split_func = s => WA_KA_CHI_GA_KI(s);
        // 多重マルコフ連鎖
        let multiple = 1;
        if(/多重/.test(mode)) {
            if(/2/.test(mode)) multiple = 2;
            else if(/3/.test(mode)) multiple = 3;
        }
        //
        markov = makeMarkov(split_func, multiple);
        for(const array of now) markov.add(array[0], array[1]);
        //----------------------------------------------------------------------------------------------------
        const max = now.length - 1;
        max_elm.text(max);
        holder_order.find("input").val(0).width(String(max).length + "em");
    };
    //--------------------------------------------------------------------------------------------------------------------------------
    //--------------------------------------------------------------------------------------------------------------------------------
    const ALL_SIGN = "すべて";
    const select = {};
    const DEFAULT = {
        kind: "ジャンル",
        title: "タイトル",
        name: "　　役名",
        mode: "生成方式"
    };
    for(const k in DEFAULT){
        if(!select[k]) select[k] = {};
        const now = select[k];
        now.title = DEFAULT[k];
        now.d = {"": null};
        switch(k){
            case "kind":
                now.change = v => {
                    if(!v) return;
                    const now_s = select.title.d;
                    for(const k in now_s) delete now_s[k];
                    now_s[""] = null;
                    for(const key in DB[v]) now_s[key] = key;
                    setMarkov();
                };
                select.kind.d[ALL_SIGN] = ALL_SIGN;
                break;
            case "title":
                now.change = v => {
                    const v2 = select.kind.f();
                    if(!v || !v2) return;
                    const now_s = select.name.d;
                    for(const k in now_s) delete now_s[k];
                    now_s[""] = null;
                    for(const key in DB[v2][v]) {
                        if(DB[v2][v][key].length <= 1) continue; // 1セリフ以下なら除外
                        now_s[key] = key;
                    }
                    setMarkov();
                };
                break;
            case "name":
                now.change = v => {
                    if(!v) return;
                    setMarkov();
                };
                break;
            case "mode":
                now.change = v => {
                    if(!v) return;
                    holder_markov.hide();
                    holder_order.hide();
                    if(/文字数/.test(v)) holder_markov.show();
                    else if(/順番/.test(v)){
                        holder_order.show();
                    }
                    setMarkov();
                };
                [
                    "ランダム取得",
                    "順番に取り出す",
                    "マルコフ連鎖(単語)",
                    "多重マルコフ連鎖(2単語)",
                    "多重マルコフ連鎖(3単語)",
                    "マルコフ連鎖(文字種)",
                    "マルコフ連鎖(文字数)"
                ].forEach(v=>{
                    now.d[v] = v;
                });
                break;
        }
    }
    let flag_removeBrackets, holder_markov, getMode_num, holder_order, getOrder_num, max_elm, first_flag;
    const setConfig = say => {
        first_flag = true;
        const h = $("<div>");
        const appendButton = (name, func) => $("<button>").appendTo(h).text(name).click(func);
        appendButton("リソースの更新",()=>{
            copied_flag = false;
            Interval(true);
        });
        //---------------------------------------------------------
        for(const k in select){
            select[k].f = yaju1919.appendSelect(h,{
                title: select[k].title,
                list: select[k].d,
                value: select[k].v,
                change: v=>{
                    select[k].change(v);
                    h.find("select").trigger('update');
                    select[k].v = v;
                },
                width: "65%"
            });
        }
        //---------------------------------------------------------
        h.children().each((i,e)=>$(e).after("<br>"));
        //---------------------------------------------------------
        flag_removeBrackets = yaju1919.appendCheckButton(h,{
            title:"括弧を外す",
            value: true
        });
        const flag_copy = yaju1919.appendCheckButton(h,{
            title:"コピー",
            value: false
        });
        //---------------------------------------------------------
        appendButton("語録生成", ()=>{
            const result = main();
            result_holder.text(result);
            if(flag_copy()) yaju1919.copy(result);
            if(flag_auto()) say(result);
        }).css({backgroundColor:"red",color:"yellow"});
        //---------------------------------------------------------
        holder_markov = $("<div>").appendTo(h);
        getMode_num = yaju1919.appendInputNumber(holder_markov,{
            title: "分割文字数",
            placeholder: "整数",
            min: 1,
            value: 2,
            save: "mode_num",
        });
        //---------------------------------------------------------
        holder_order = $("<div>").appendTo(h);
        getOrder_num = yaju1919.appendInputNumber(holder_order.append("次の位置("),{
            placeholder: "整数",
            min: 0,
            value: null,
        });
        max_elm = $("<span>");
        holder_order.append("/").append(max_elm).append(")");
        //---------------------------------------------------------
        holder_markov.hide();
        holder_order.hide();
        //---------------------------------------------------------
        const result_holder = $("<div>").appendTo(h);
        return h;
    };
    //--------------------------------------------------------------------------------------------------------------------------------
    //--------------------------------------------------------------------------------------------------------------------------------
    //------リソースの更新--------------------------------------------------------------------------------------------------------------------------
    const DB = {};
    const add_to_DB = (text, name, p1, p2, p3) => {
        if(!DB[p1]) DB[p1] = {};
        if(!DB[p1][p2]) DB[p1][p2] = {};
        if(!DB[p1][p2][p3]) DB[p1][p2][p3] = [];
        DB[p1][p2][p3].push([name, text]);
    };
    const getResource = (now,isOverwrite) => {
        const ar = now.split('/');
        const kind = ar[0];
        const title = ar[1];
        const url = "https://raw.githubusercontent.com/yaju1919/CookieKiss/master/resource/" + now;
        if(kind === ALL_SIGN || title === ALL_SIGN) return;
        select.kind.d[kind] = kind;
        const brackets = {
            '「': '」',
            '（': '）',
            '(': ')'
        };
        const func = str => {
            str.split("\n").filter(v=>v).forEach(v=>{
                const key_position = (()=>{
                    let min = Infinity;
                    for(const e of Object.keys(brackets)){
                        const p = v.indexOf(e);
                        if(p!==-1&&p<min) min = p;
                    }
                    return min;
                })();
                if(key_position === Infinity) return;
                const name = v.slice(0,key_position).trim();
                if(name.length===0||name.length>10) return;
                const key = v[key_position];
                const first = key_position+1;
                const last = v.lastIndexOf(brackets[key]);
                if(last===-1) return;
                const text = key + v.slice(first, last).trim() + brackets[key];
                const list = [kind, title, name];
                ["000","100","010","001","110","101","011","111"].forEach(v=>{
                    const a = v.split("").map((v,i)=>Number(v)?list[i]:ALL_SIGN);
                    add_to_DB(text, name, a[0], a[1], a[2]);
                });
            });
        };
        if(save_data[now]&&!isOverwrite) { // セーブデータがあればそれ優先
            wait_time = 0;
            func(save_data[now]);
        }
        else {
            wait_time = 1000;
            get(url, r=>{
                func(r);
                yaju1919.save(now,r);
            });
        }
    };
    let wait_time, stack, copied_flag;
    const Interval = isOverwrite => {
        if(!copied_flag) {
            wait_time = 1000;
            copied_flag = true;
            stack = LIST.slice();
        }
        if(!stack.length) return;
        const now = stack.shift();
        getResource(now,isOverwrite);
        setTimeout(()=>Interval(isOverwrite), wait_time);
    };
    const LIST = [
        "クッキー☆/魔理沙とアリスのクッキーKiss",
        "クッキー☆/旧クリスマス企画",
        "クッキー☆/お正月企画",
        "クッキー☆/新クリスマス企画",
        //"クッキー☆/クッソー☆",
        //"クッキー☆/クッソー☆☆",
        "クッキー☆/霊夢と魔理沙のチョコレート★ハート",
        "クッキー☆/メッモー☆",
        "クッキー☆/クラウンピースと小さな勇気",
        //"クッキー☆/カス☆",
        "クッキー☆/鍋パーティ",
        "クッキー☆/クッキー☆☆☆",
        //"クッキー☆/魔理沙さんのスペルカードを探せ！",
        //"クッキー☆/再翻訳クッキー☆",
        //"クッキー☆/UDKとRUの確執",
        //"クッキー☆/シアトル・マリナーズは関係ないだろ",
        //"クッキー☆/イワナ",
        //"クッキー☆/HSI姉貴こえ部音声まとめ.mp138",
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
    const save_data = {};
    LIST.forEach(v=>yaju1919.load(v,d=>{
        save_data[v] = d;
    }));
    Interval();
    setTimeout(()=>{
        setConfig().appendTo($("body"));
    }, 5000);
})();
