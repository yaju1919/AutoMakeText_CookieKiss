const yaju1919_library = (() => {
    //------------------------------------------------------------------------------------------------------
    const rand = ar => ar[Math.floor(Math.random()*ar.length)]; // ランダムな要素を返す
    const getTime = () => new Date().toString().match(/[0-9]{2}:[0-9]{2}:[0-9]{2}/)[0]; // xx:yy:zz の形式で現在時刻の文字列を返す
    const getType = a => Object.prototype.toString.call(a).replace(/\[object |\]/g,""); // 型を返す
    const toHan = s => s.replace(/[Ａ-Ｚａ-ｚ０-９！-～]/g, c => String.fromCharCode(c.charCodeAt(0)-0xFEE0)); // 全角→半角
    const toZen = s => s.replace(/[A-Za-z0-9!-~]/g, c => String.fromCharCode(c.charCodeAt(0)+0xFEE0)); // 半角→全角
    const toHira = s => s.replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)); // カナ→ひら
    const toKana = s => s.replace(/[\u3041-\u3096]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60)); // ひら→カナ
    const copy = s => { // クリップボードにコピーする
        const e = document.createElement("textarea");
        e.textContent = s;
        const body = document.getElementsByTagName("body")[0];
        body.appendChild(e);
        e.select();
        document.execCommand('copy');
        body.removeChild(e);
    };
    // テキストファイル形式で保存
    const download = (str, title) => { // str: 保存する文字列, title: ファイルの名前
        if(getType(title) !== "String" || getType(str) !== "String") return false; // 失敗
        if(!title.length || !str.length) return false; // 失敗
        const strText = str.replace(/\n/g,'\r\n'); // 改行を置換
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);// 文字化け対策
        const blob = new Blob([bom, strText], {type: "text/plain"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.target = '_blank';
        a.download = title + '.txt';
        a.click();
        return true; // 成功
    };
    const getFQDN = url => url.replace(/^.+?\/\/|\/.*$/g,""); // urlのホストを抽出
    const getDomain = url => getFQDN(url).split(".").slice(-2).join("."); // urlのドメインを抽出(サードレベルドメイン非対応)
    //------------------------------------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------------
    const appendInputText = (parent,{title,change,value,save,width,placeholder,enter,hankaku=true,max=null,textarea=false}={}) => { // 文字列入力欄を追加
        const h = $("<span>").appendTo(parent);
        if(title) h.append(title + "：");
        const i = $(textarea ? "<textarea>" : "<input>").appendTo(h)
        .attr('placeholder',placeholder)
        .change(()=>{
            let v = i.val();
            if(hankaku) v = toHan(v);
            v = v.trim();
            i.val(v);
            if(change) change(v);
            if(save) g_save(save,v);
        }).val(String(value))
        .keypress(e=>{
            if(enter && e.key === 'Enter') enter();
        });
        if(max) i.attr("maxlength",max);
        if(save) load(save,v=>i.val(v));
        if(width) {
            i.css({maxWidth: width});
            i.css({minWidth: width});
        }
        else if(placeholder) i.width(placeholder.length+'em');
        return () => i.val();
    };
    //------------------------------------------------------------------------------------------------------
    const appendInputNumber = (parent,{title,change,value,save,width,placeholder,enter,min=null,max=null,int}={}) => { // 数値入力欄を追加
        const h = $("<span>").appendTo(parent);
        if(title) h.append(title + "：");
        const i = $("<input>").appendTo(h)
        .attr('placeholder',placeholder)
        .change(()=>{
            let n = Number(toHan(i.val()).trim().replace(/[^0-9.\-]/g,""));
            if(isNaN(n)) n = value||min||max||0;
            else if(n < min && min !== null) n = min;
            else if(n > max && max !== null) n = max;
            if(int) n = parseInt(n);
            i.val(n);
            if(change) change(n);
            if(save) g_save(save,n);
        }).val(String(value)||String(min))
        .keypress(e=>{
            if(enter && e.key === 'Enter') enter();
        });
        if(save) load(save,v=>i.val(v));
        if(width) {
            i.css({maxWidth: width});
            i.css({minWidth: width});
        }
        else if(placeholder) i.width(placeholder.length+'em');
        return () => Number(i.val());
    };
    //------------------------------------------------------------------------------------------------------
    const appendRandBetween = (parent,{title,change,value,save,width,placeholder,enter,min=null,max=null,int}={}) => {
        const h = $("<span>").appendTo(parent);
        const v2 = value;
        value = [value, value];
        if(getType(v2) === "Array") {
            if(v2.length === 2){
                value = [v2[0], v2[1]];
            }
        }
        const changeFunc = () => {
            if(change) change(make());
            if(save) g_save(save,[a(),b()].join('x'));
        };
        const json = {
            change: changeFunc,
            width: width,
            placeholder: placeholder,
            enter: enter,
            min: min,
            max: max,
            int: int,
        };
        const a = appendInputNumber(h, Object.assign({
            title: title,
            value: value[0],
        },json));
        h.append(" ～ ");
        const b = appendInputNumber(h, Object.assign({
            value: value[1],
        },json));
        if(save) {
            load(save,v=>{
                const ar = v.split('x');
                if(ar.length !== 2) return;
                h.find("input").each((i,e)=>$(e).val(ar[i]));
            });
        }
        const make = () => {
            let max = a(),
                min = b();
            if(max < min) [max, min] = [min, max];
            const r = Math.random() * (max - min + 1) + min;
            return int ? Math.floor(r) : r;
        };
        return make;
    };
    //------------------------------------------------------------------------------------------------------
    const appendCheckButton = (parent,{title,change,value,save}={}) => { // チェックボックスを追加
        let flag = value;
        const h = $("<span>").appendTo(parent);
        const check = $("<input>",{type:"checkbox"});
        const set = (bool,isClick) => {
            flag = bool;
            btn.css("background-color",flag ? "orange" : "gray");
            check.prop("checked",flag);
            if(change && isClick) change(flag);
        };
        const btn = $("<button>").appendTo(h)
        .append(check).append(title).click(()=>{
            set(!flag,true);
            if(save) g_save(save, flag ? '1' : '0');
        });
        set(flag);
        if(save) {
            load(save,v=>{
                if(v==='1') set(true);
                else if(v==='0') set(false);
            });
        }
        return () => flag;
    };
    //------------------------------------------------------------------------------------------------------
    const appendSelect = (parent,{title,change,value,save,width,list={}}={}) => { // 選択欄を追加
        const h = $("<span>").appendTo(parent);
        if(title) h.append(title + "：");
        const update = () => {
            const v = s.val();
            s.empty();
            for(const k in list) $("<option>",{text:k}).val(list[k]).appendTo(s);
            if(v) s.val(v);
        };
        const s = $("<select>").appendTo(h)
        .change(() => {
            const v = s.val();
            if(change) change(v);
            if(save) g_save(save,v);
        })
        .click(update)
        .on('update', update);
        update();
        s.val(value);
        if(save) load(save,v=>s.val(v));
        if(width) {
            s.css({maxWidth: width});
            s.css({minWidth: width});
        }
        return () => s.val();
    };
    //------------------------------------------------------------------------------------------------------
    const appendInputRange =(parent,{title,change,value,save,width,min=0,max=1,step=0.01}={}) => { // 調節バーを追加
        if(!value && value !== 0) value = (min + max) / 2;
        const h = $("<span>").appendTo(parent);
        if(title) h.append(title + "：");
        const i = $("<input>",{type:"range"}).appendTo(h)
        .attr({
            min: min,
            max: max,
            step: step,
            value: value
        })
        .change(() => {
            const n = Number(i.val());
            if(change) change(n);
            if(save) g_save(save,n);
        });
        if(save) load(save,v=>i.val(v));
        if(width) {
            i.css({maxWidth: width});
            i.css({minWidth: width});
        }
        return () => Number(i.val());
    };
    //------------------------------------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------------
    const json_to_query = json => {
        const obj = json || {};
        if(!obj._) obj._ = new Date().getTime();
        const ar = [];
        for(const k in obj) ar.push(k+'='+String(obj[k]).replace(/\?/g,"？").replace(/=/g,"＝"));
        return ar.join('&');
    };
    //------------------------------------------------------------------------------------------------------
    const get = (url,{json, success=()=>{}, fail=()=>{}}={}) => { // GETリクエスト
        $.get(url + (json ? '?' + json_to_query(json) : ''))
        .done(success)
        .fail(fail);
    };
    //------------------------------------------------------------------------------------------------------
    const post = (url,{json, success=()=>{}, fail=()=>{}}={}) => { // POSTリクエスト
        $.post(url,json)
        .done(success)
        .fail(fail);
    };
    //------------------------------------------------------------------------------------------------------
    const g_save = (name,value) => { // 文字列の保存
        localStorage.setItem(name, value);
    };
    const load = (name,callback) => { // 保存した文字列の読み込み
        callback(localStorage.getItem(name));
    };
    //------------------------------------------------------------------------------------------------------
    //------------------------------------------------------------------------------------------------------
    return {
        rand: rand,
        getTime: getTime,
        getType: getType,
        toHan: toHan,
        toZen: toZen,
        toHira: toHira,
        toKana: toKana,
        copy: copy,
        download: download,
        getFQDN: getFQDN,
        getDomain: getDomain,
        appendInputText: appendInputText,
        appendInputNumber: appendInputNumber,
        appendRandBetween: appendRandBetween,
        appendCheckButton: appendCheckButton,
        appendSelect: appendSelect,
        appendInputRange: appendInputRange,
        get: get,
        post: post,
        save: g_save,
        load: load,
    };
    //------------------------------------------------------------------------------------------------------
})();
