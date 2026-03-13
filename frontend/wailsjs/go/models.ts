export namespace main {
	
	export class Transaction {
	    account: string;
	    date: string;
	    description: string;
	    category: string;
	    value: number;
	    status: string;
	    matchedWith: string;
	
	    static createFrom(source: any = {}) {
	        return new Transaction(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.account = source["account"];
	        this.date = source["date"];
	        this.description = source["description"];
	        this.category = source["category"];
	        this.value = source["value"];
	        this.status = source["status"];
	        this.matchedWith = source["matchedWith"];
	    }
	}

}

