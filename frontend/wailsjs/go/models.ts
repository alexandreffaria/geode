export namespace main {
	
	export class Transaction {
	    id: string;
	    date: string;
	    source: string;
	    destination: string;
	    amount: number;
	    currency: string;
	    description: string;
	    status: string;
	    tags: string;
	
	    static createFrom(source: any = {}) {
	        return new Transaction(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.date = source["date"];
	        this.source = source["source"];
	        this.destination = source["destination"];
	        this.amount = source["amount"];
	        this.currency = source["currency"];
	        this.description = source["description"];
	        this.status = source["status"];
	        this.tags = source["tags"];
	    }
	}

}

