import http from "http"
import url from "url"
import fs from "fs"
import path from "path"
import { render } from "./render.js"

export default class pejvak {
	server = undefined;
	settings = undefined;
	handlers = { "GET": {}, "POST": {} };
	binds = [];

	constructor(settings, routes, virtualPaths) {
		this.settings = settings;

		for (const i in routes)
			this.handlers["GET"][i] = [routes[i].file, routes[i].template];
		for (const v in virtualPaths)
			this.bind(v, virtualPaths[v]);
	}
	start() {
		this.server = http.createServer((request, response) => {
			this.handleRequests(request, response);
		}).listen(this.settings.port, () => {
			console.log("server started on port", this.settings.port);
		});
	}
	handleRequests(request, response) {
		var pathName = url.parse(request.url).pathname;
		var handler = this.handlers[request.method][pathName];
		if (handler && typeof handler == "function") {
			handler(request, response);
		}
		else if (handler && typeof handler === typeof []) {
			if (handler[0].split('.')[1].toLowerCase() == 'render')
				response.renderHTML(response, path.normalize(this.settings.www + handler[0]), this.settings.view + handler[1]);
			else
				this.loadStaticFile(path.normalize(this.settings.www + handler[0]), response);
		}
		else {
			var rep = pathName;
			for (const i in this.binds)
				rep = rep.replace(this.binds[i].dst, this.binds[i].src);
			if (rep == pathName)
				rep = this.settings.www + pathName;
			this.loadStaticFile(path.normalize(rep), response);
		}
	}
	loadStaticFile(path, response) {
		var _fs = fs.createReadStream(path).on('ready', (e) => {
			_fs.pipe(response);
		}).on('error', (e) => {
			console.log(`${e}`);
			response.writeHead(404, { "Content-Type": "text/html" });
			response.write(`${e}`);
			response.end();
		});
	}
	handle(method, addr, callback) {
		this.handlers[method][addr] = callback;
	}
	bind(destination, source) {
		this.binds.push({ dst: destination, src: source });
		this.binds.sort(function (a, b) {
			return b.dst.length - a.dst.length;
		});
	}
}
