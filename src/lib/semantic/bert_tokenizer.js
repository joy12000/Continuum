/**
 * Minimal BERT WordPiece tokenizer (uncased) using /models/vocab.txt
 * Supports: [CLS], [SEP], [PAD], [UNK] tokens, max length 128
 * This avoids @huggingface/tokenizers dependency.
 */
export class BertWordPiece {
    vocab = new Map();
    inv = [];
    ready = false;
    CLS = 101;
    SEP = 102;
    PAD = 0;
    UNK = 100;
    maxLen = 128;
    async load(url = "/models/vocab.txt") {
        if (this.ready)
            return true;
        const r = await fetch(url);
        if (!r.ok)
            return false;
        const text = await r.text();
        const lines = text.split(/\r?\n/);
        this.inv = [];
        this.vocab.clear();
        for (let i = 0; i < lines.length; i++) {
            const token = lines[i].trim();
            if (!token)
                continue;
            this.vocab.set(token, i);
            this.inv.push(token);
        }
        // attempt to detect special token ids
        this.CLS = this.vocab.get("[CLS]") ?? this.CLS;
        this.SEP = this.vocab.get("[SEP]") ?? this.SEP;
        this.PAD = this.vocab.get("[PAD]") ?? this.PAD;
        this.UNK = this.vocab.get("[UNK]") ?? this.UNK;
        this.ready = true;
        return true;
    }
    basicTokenize(text) {
        // Lowercase and split on non-letters/digits/apostrophes (simple)
        text = text.normalize("NFKC").toLowerCase();
        // Separate punctuation
        text = text.replace(/([\p{P}])/gu, " $1 ");
        return text.split(/\s+/).filter(Boolean);
    }
    wordpiece(token) {
        if (this.vocab.has(token))
            return [this.vocab.get(token)];
        const chars = token;
        const out = [];
        let start = 0;
        while (start < chars.length) {
            let end = chars.length;
            let cur = null;
            while (start < end) {
                let substr = chars.slice(start, end);
                if (start > 0)
                    substr = "##" + substr;
                const id = this.vocab.get(substr);
                if (id != null) {
                    cur = id;
                    break;
                }
                end -= 1;
            }
            if (cur == null) {
                return [this.UNK];
            }
            out.push(cur);
            start = end;
        }
        return out;
    }
    async encode(text) {
        if (!this.ready) {
            const ok = await this.load();
            if (!ok)
                return { ids: [], mask: [] };
        }
        const pieces = [];
        const tokens = this.basicTokenize(text);
        for (const t of tokens) {
            const ids = this.wordpiece(t);
            pieces.push(...ids);
        }
        // Truncate to leave room for [CLS] and [SEP]
        const maxBody = this.maxLen - 2;
        const body = pieces.slice(0, maxBody);
        const ids = [this.CLS, ...body, this.SEP];
        const mask = new Array(ids.length).fill(1);
        while (ids.length < this.maxLen) {
            ids.push(this.PAD);
            mask.push(0);
        }
        return { ids, mask };
    }
}
