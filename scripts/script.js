`use strict`;
const d = {
    i: (val) => {
        return document.getElementById(val);
    },
    c: (val) => {
        return document.getElementsByClassName(val);
    },
};
class Debounce {
    constructor(fn, time) {
        this.check = 0;
        this.fn = fn;
        this.time = time;
    }
    async timeout() {
        return new Promise((res) => {
            setTimeout(() => res(), this.time);
        });
    }
    func(...args) {
        return this.fn(...args);
    }
    async debounce(...args) {
        const ch = ++this.check;
        await this.timeout();
        if (ch === this.check) {
            this.check = 0;
            return this.fn(...args);
        }
    }
}
const api = {
    search: async (doc, query) => {
        [doc, query] = [encodeURIComponent(doc), encodeURIComponent(query)];

        const result = await fetch(`/search?doc=${doc}&q=${query}`);
        if (result.status == 200) {
            return result;
        } else {
            throw await result.text();
        }
    },
    installed: async () => {
        const result = await fetch(`/installed`);
        if (result.status == 200) {
            return result;
        } else {
            throw await result.text();
        }
    },
};
const content = {
    input: {
        numberStore: null,
        get number() {
            return this.numberStore;
        },
        set number(n) {
            this.numberStore = n;
            if (n == null) {
                d.i(`number`).innerHTML = ``;
            } else {
                d.i(`number`).innerHTML = n;
            }
        },
        get query() {
            return view.input.query.value;
        },
        set query(val) {
            view.input.query.value = val;
        },
        get filter() {
            return view.input.filter.value;
        },
        set filter(val) {
            view.input.filter.value = val;
        },
        reset: () => {
            view.input.query.value = ``;
            view.input.filter.value = ``;
        },
    },
    installed: {
        store: [],
        match: (filter) => {
            if (!Array.isArray(filter)) throw new TypeError(`Argument filter should be an array (of keywords)`);

            if (filter.length == 1 && filter[0] == `all`) {
                return content.installed.store;
            } else {
                return content.installed.store.filter((d) => {
                    const dLower = d.toLowerCase();
                    for (let i = filter.length; i--;) {
                        if (filter[i][0] == `-` && dLower.includes(filter[i].substring(1))) {
                            return false;
                        } else if (filter[i] && dLower.includes(filter[i])) {
                            return true;
                        }
                    }
                    return false;
                });
            }
        },
        get all() {
            return content.installed.store;
        },
        set all(val) {
            if (!Array.isArray(val)) throw new TypeError(`installed docs should be in an array`);

            content.installed.store = val;
            view.installed.all(val);
        },
    },
    results: {
        store: {},
        count: -1,
        add: (doc, res) => {
            if (!Array.isArray(res)) throw new TypeError(`results should be in an array`);

            content.results.store[doc] = res;
            view.results.add(doc, res);
            mode.normal.hi = -1;
        },
        get all() {
            return content.results.store;
        },
        set all(val) {
            content.results.store = val;

            view.results.all = val;
        },
        reset: () => {
            content.results.store = {};
            view.results.reset();
            content.results.count = -1;
        },
    },
};
const view = {
    input: {
        get query() {
            return d.i(`query`);
        },
        get filter() {
            return d.i(`filter`);
        },
    },
    installed: {
        all: (docs) => {
            if (!Array.isArray(docs)) throw new TypeError(`Argument docs must be an array`);

            const parent = d.i(`filtered-docs`);
            parent.innerHTML = ``;
            docs.map((d) => {
                const el = document.createElement(`span`);
                el.innerHTML = d;
                el.classList.add(`doc-name`);
                parent.appendChild(el);
            });
        },
        match: (docs) => {
            if (!Array.isArray(docs)) throw new TypeError(`Argument docs must be an array`);

            const docElems = d.c(`doc-name`);
            for (let i = docElems.length; i--;) {
                if (docs.findIndex((v) => v == docElems[i].innerHTML) == -1) {
                    docElems[i].classList.remove(`doc-name-show`);
                } else {
                    docElems[i].classList.add(`doc-name-show`);
                }
            }
        },
    },
    results: {
        store: d.c(`result`),
        add: (doc, val) => {
            const getURL = (doc, path) => `/d/${doc}.docset/Contents/Resources/Documents/${path}`;
            const getPage = (path) => path.split(`/`).pop().split(`.`).slice(0, -1).join(`.`);
            // const getPage = (path) => {
            //     let page = ``;
            //     let extRemoved = false;
            //     for (let i = path.length; i--;) {
            //         if (extRemoved) {
            //             if (path[i] == `/`) {
            //                 return page;
            //             } else {
            //                 page = path[i] + page;
            //             }
            //         }
            //         if (!extRemoved && path[i] === `.`) extRemoved = true;
            //     }
            // }

            const section = d.i(`results`);

            const el = document.createElement(`h2`);
            el.innerHTML = doc;
            section.appendChild(el);
            val.map((v) => {
                content.results.count++;

                const elem = document.createElement(`a`);
                // elem.innerHTML = `${content.results.count}: ${v.name}`;
                elem.appendChild(document.createTextNode(`${content.results.count}: ${v.name}`));

                const page = document.createElement(`span`);
                page.classList.add(`page`);
                page.innerHTML = ` (${getPage(v.path)})`;

                elem.appendChild(page);

                elem.classList.add(`result`);
                // if (content.results.count % 2 != 0) elem.classList.add(`odd`);

                elem.setAttribute(`href`, getURL(doc, v.path));
                elem.setAttribute(`target`, `_blank`);

                elem.dataset.count = content.results.count;
                elem.setAttribute(`onmouseover`, `mode.normal.high(this.dataset.count)`);

                section.appendChild(elem);
            });
            if (!section.innerHTML.trim()) {
                const elem = document.createElement(`span`);
                elem.innerHTML = `Not Found`;
                elem.classList.add(`not-found`);
                section.appendChild(elem);
            }
            view.results.update();
        },
        get all() {
            return view.results.store;
        },
        set all(val) {
            for (const doc of Object.keys(val)) {
                view.results.add(doc, val[doc]);
            }
        },
        update: () => {
            view.results.store = d.c(`result`);
        },
        reset: () => {
            d.i(`results`).innerHTML = ``;
            view.results.update();
        },

    },
};
const handler = {
    search: async () => {
        const query = content.input.query;
        if (!query || mode.filter.matchDocs.length === 0) return;

        content.results.reset();

        mode.filter.matchDocs.map(async (d) => {
            let resp = await api.search(d, query);
            resp = await resp.json();
            content.results.add(d, resp);
        });

        const stateToStore = {
            query: content.input.query,
            filter: content.input.filter,
        };
        const objCmp = (a, b) => {
            if (!a || !b) return false;
            for (const i of Object.keys(a)) {
                if (a[i] != b[i]) return false;
            }
            return true;
        };
        if (!objCmp(history.state, stateToStore)) {
            history.pushState(stateToStore, ``);
        }
    },
    buttons: {
        'KeyJ': (isAltPressed) => {
            if (mode.state === 0) {
                if (!isAltPressed) {
                    mode.normal.high(mode.normal.hi + 1, true);
                } else {
                    mode.normal.high(-1, true);
                }
            }
        },
        'KeyK': (isAltPressed) => {
            if (mode.state === 0) {
                if (!isAltPressed) {
                    mode.normal.high(mode.normal.hi - 1, true);
                } else {
                    mode.normal.high(0, true);
                }
            }
        },
        // 'KeyH': () => {},
        'KeyL': () => {
            mode.normal.line.next();
        },
        'Space': () => {
            if (mode.state === 0) {
                mode.normal.openResult();
                handler.buttons[`Minus`]();
            }
        },
        'KeyI': (isAltPressed) => {
            if (mode.state === 0) {
                mode.state = 2;
                if (isAltPressed) d.i(`query`).value = ``;
                d.i(`query`).focus();
            }
        },
        'KeyF': (isAltPressed) => {
            if (mode.state === 0) {
                mode.state = 3;
                if (isAltPressed) d.i(`filter`).value = ``;
                d.i(`filter`).focus();
            }
        },
        'KeyS': (isAltPressed) => {
            if (mode.state === 0 && mode.normal.hi >= 0) {
                if (!isAltPressed) {
                    mode.normal.select(mode.normal.hi);
                    handler.buttons[`Minus`]();
                } else {
                    mode.normal.resetSelect();
                }
            }
        },
        'Minus': () => {
            if (mode.state === 0) {
                content.input.number = null;
            }
        },
        'NumpadSubtract': () => {
            handler.buttons[`Minus`]();
        },
        'Escape': () => {
            mode.state = 0;
            d.i(`query`).blur();
            d.i(`filter`).blur();
        },
        'CapsLock': () => {
            handler.buttons[`Escape`]();
        },
        'Enter': () => {
            if (mode.state == 3) mode.filter.match.func();
            handler.search();
            handler.buttons[`Escape`]();
        },
        'digits': (n) => {
            if (content.input.number == null) {
                content.input.number = n;
            } else {
                content.input.number = (content.input.number * 10) + n;
            }
            mode.normal.high(content.input.number, true);
        },
    },
    history: (state) => {
        let [query, filter] = [``, ``];
        if (state && state.query && state.filter) {
            query = state.query;
            filter = state.filter;
        }
        content.input.query = query;
        content.input.filter = filter;

        mode.filter.match.func();
        handler.search();
    },
};
const mode = {
    stateStore: 0, // states - 0: Normal, 1: Select, 2: Insert, 3: Filter
    get state() {
        return mode.stateStore;
    },
    set state(val) {
        const prevStateStore = mode.stateStore;
        mode.stateStore = val;
        const upd = (v) => d.i(`mode`).innerHTML = v;
        switch (val) {
        case 0: {
            upd(`normal mode`);
            break;
        }
        case 1: {
            upd(`select mode`);
            break;
        }
        case 2: {
            upd(`insert mode`);
            break;
        }
        case 3: {
            upd(`filter mode`);
            break;
        }
        default: {
            mode.stateStore = prevStateStore;
            throw new TypeError(`state cannot have ${val} value`);
        }
        };
    },
    normal: {
        hi: -1,
        selectStore: [],
        high: (n, scroll) => {
            if (view.results.all.length === 0) return;
            n = Number(n);
            if (isNaN(n)) throw new TypeError(`The value of "n" must be a number. It can't be ${n}`);

            n = n % view.results.all.length;
            if (n < 0) n = view.results.all.length - 1;

            if (mode.normal.hi >= 0) {
                view.results.all[mode.normal.hi].classList.remove(`highlight`);
            }

            view.results.all[n].classList.add(`highlight`);
            if (scroll) {
                view.results.all[n].scrollIntoView({
                    behavior: `auto`,
                    block: `center`,
                    inline: `center`,
                });
            }
            mode.normal.hi = n;
        },
        select: (n) => {
            if (mode.normal.selectStore.indexOf(n) == -1) {
                mode.normal.selectStore.push(n);
                view.results.all[n].classList.add(`select`);
            } else {
                mode.normal.selectStore.splice(mode.normal.selectStore.indexOf(n), 1);
                view.results.all[n].classList.remove(`select`);
            }
        },
        resetSelect: () => {
            while (mode.normal.selectStore.length > 0) {
                mode.normal.select(mode.normal.selectStore[0]);
            }
        },
        openResult: () => {
            if (mode.normal.selectStore.length > 0) {
                mode.normal.selectStore.map((e) => window.open(view.results.all[e].href));
            } else {
                if (mode.normal.hi < 0) return;
                window.open(view.results.all[mode.normal.hi].href, `_blank`);
            }
        },
        line: (function* () {
            while (true) {
                d.i('results').classList.toggle('stretch');
                console.log('a');
                yield;

                d.i('results').classList.toggle('stretch');
                console.log('b');
                yield;
            }
        })(),
    },
    filter: {
        matchDocs: [],
        match: new Debounce(() => {
            const filter = content.input.filter.toLowerCase().split(` `);

            mode.filter.matchDocs = content.installed.match(filter);
            view.installed.match(mode.filter.matchDocs);
        }, 500, content.input.filter),
    }, insert: {
        input: new Debounce(
            () => {
                if (content.input.query.length >= 3) handler.search();
            },
            500
        ),
    },
};
window.onkeydown = (ev) => {
    // console.log(ev.code);

    const incl = (st, ar) => ar.reduce((p, c) => p || st.includes(c), false);
    const find = (c, ar) => ar.indexOf(c) > -1;
    const cond1 = (c) => find(c, [`Escape`, `CapsLock`, `Enter`]);
    const cond2 = (c) => find(c, [`Backspace`, `Delete`, `Space`]);

    if (incl(ev.code, [`Digit`, `Numpad`]) && !isNaN(ev.code.slice(-1)) && mode.state == 0) {
        handler.buttons[`digits`](Number(ev.code.slice(-1)));
    } else if ((mode.state < 2 && handler.buttons[ev.code]) || cond1(ev.code)) {
        handler.buttons[ev.code](ev.altKey);
        ev.preventDefault();
    } else if (mode.state == 3) {
        if ((ev.key.length === 1 && !ev.altKey && !ev.ctrlKey) || cond2(ev.code)) {
            mode.filter.match.debounce();
        }
    } else if (mode.state == 2) {
        if ((ev.key.length === 1 && !ev.altKey && !ev.ctrlKey) || cond2(ev.code)) {
            mode.insert.input.debounce();
        }
    }
};
window.onpopstate = (ev) => handler.history(ev.state);

const main = async () => {
    let res = await api.installed();
    res = await res.json();
    content.installed.all = res.docs;
    mode.state = 0;
    handler.history(history.state);
};
window.onload = main;
