;(function(){
	var Grapher = function(options, data){
		if(!options || options.container){
			console.warn('Container required, creating');
			Grapher.__create(this);	
		} else {
			this.__container = options.container;
			this.__options = options.params;
		}
		
		if(data){
			this.__nodes = new vis.DataSet();
			this.__edges = new vis.DataSet();
			this.__nodes.add(data.nodes);
			this.__edges.add(data.edges);
		}

		this.__types = {
			nodes: [],
			edges: []
		};

		this.__events = {};
	};
	window.Grapher = Grapher;

	Grapher.__create = function(instance){
		var div = document.createElement('div');
		document.body.appendChild(div);
		instance.__container = div;

		document.querySelector('html').style.width = '100%';
		document.querySelector('html').style.height = '100%';
		document.body.style.width = '100%';
		document.body.style.height = '100%';
		document.body.style.margin = '0px';

		instance.__container.style.width = '100%';
		instance.__container.style.height = '100%';
		instance.__container.style.backgroundColor = '#24232c';
	};

	Grapher.prototype.node = function(node){
		if(node.type){
			let type = this.__types.nodes.find(e => e.name === node.type);
			node.color = type.color;
			node.__original_color = type.color;
			node.shape = 'dot';
			node.font = {
				color:'#FFF'
			};
		}

		this.__nodes.add(node);
	};

	Grapher.prototype.type = function(obj, params){
		let arr;
		if(obj === 'node'){
			arr = this.__types.nodes;
		} else if(obj === 'edge'){
			arr = this.__types.edges;
		} else {
			throw new Error('Only node and edge are accepted objects for new types');
		}

		let exists = arr.find(e => e.name === params.name);
		if(exists){
			console.warn(`${obj} type ${params.name} exists, modifying`);
			exists.color = params.color;
			return this;
		}

		arr.push({
			name: params.name,
			color: params.color || '#ebebeb'
		});

		return this;
	};

	Grapher.prototype.__type = function(a, obj){
		if(!obj.type){
			return obj;
		}

		let arr;
		if(a === 'node'){
			arr = this.__types.nodes;
		} else if(a === 'edge'){
			arr = this.__types.edges;
		}

		let type = arr.find(e => e.name === obj.type);
		if(!type){
			return obj;
		}

		obj.color = type.color;
		obj.__original_color = type.color;
		if(a === 'edge'){
			obj.label = obj.label ? obj.label + '\n' + type.name : type.name;
		}
		return obj;
	};

	Grapher.prototype.graph = function(){
		return this.__graph;
	};

	Grapher.prototype.add = function(data){
		if(data.nodes){
			this.__nodes.add(data.nodes);
		}

		if(data.edges){
			this.__edges.add(data.edges);
		}
		return this;
	};

	Grapher.prototype.link = function(edge){
		if(edge.type){
			let type = this.__types.edges.find(e => e.name === edge.type);
			edge.color = type.color;
			edge.__original_color = type.color;
			edge.label = edge.label ? edge.label + '\n' + type.name : type.name;
		}

		this.add({edges: [edge]});
		return this;
	};

	Grapher.prototype.unlink = function(n1, n2){
		if(n1 instanceof Object){
			n1 = n1.id;
			n2 = n2.id;
		}

		let edge = this.__edges.get().find(e => {
			return (e.from === n1 && e.to === n2) || (e.from === n2 && e.to === n1);
		});

		if(edge){
			this.__edges.remove(edge.id);
		}
		return this;
	};

	Grapher.prototype.update = function(data){
		data.nodes = data.nodes.map(n => {
			n.shape = 'dot';
			n.font = {
				color: '#FFF'
			};


			return this.__type('node', n);
		});

		data.edges = data.edges.map(e => {
			return this.__type('edge', e);
		});

		if(this.__nodes && data.nodes){
			this.__nodes.update(data.nodes);
		}

		if(this.__edges && data.edges){
			this.__edges.update(data.edges);
			this.__resetColor();
			return;
		}

		this.__nodes = new vis.DataSet();
		this.__edges = new vis.DataSet();

		if(data.nodes){
			this.__nodes.add(data.nodes);
		}
		if(data.edges){
			this.__edges.add(data.edges);
		}

		if(this.__graph){
			this.__graph.setData({
				nodes: this.__nodes,
				edges: this.__edges
			});

			this.__graph.__data = {nodes: this.__nodes, edges: this.__edges};
		}

		this.__resetColor();
		this.draw();
		return this;
	};

	Grapher.prototype.draw = function(){
		if(this.__graph){
			this.__graph.redraw();
			return  this;
		}

		this.__graph = new vis.Network(this.__container, {
			nodes: this.__nodes,
			edges: this.__edges
		}, {
			layout: {
				improvedLayout: false
			},
			physics: {
				enabled: this.__options ? (this.__options.physics || false) : false,
				solver: 'forceAtlas2Based'
			}
		});

		return this;
	};

	Grapher.prototype.data = function(){
		return {
			nodes: this.__nodes.get(),
			edges: this.__edges.get()
		};
	};

	Grapher.prototype.stabilize = function(number){
		if(number){
			this.__graph.stabilize(number);
			return this;
		}
		this.__graph.startSimulation();
		return this;
	};

	Grapher.prototype.freeze = function(){
		this.__graph.stopSimulation();
		return this;
	};

	Grapher.prototype.on = function(event, callback){
		if(this.__graph){
			this.__graph.on(event, callback);
			return this;
		}

		if(!(event in this.__events)){
			this.__events[event] = [];
		}

		this.__events[event].push(callback);
		return this;
	};

	Grapher.prototype.fire = function(event, data){
		if(!(event in this.__events)){
			console.error('No event named ' + event);
			return this;
		}

		this.__events[event].forEach(function(func){
			setTimeout(func(data), 0);
		});

		return this;
	};

	Grapher.prototype.__resetColor = function(){
		let edges = this.__edges.get().map(function(edge){
			return {
				id: edge.id,
				color: edge.__original_color ? edge.__original_color : '#33c65c'
			};
		});

		let nodes = this.__nodes.get().map(function(node){
			return {
				id: node.id,
				color: node.__original_color ? node.__original_color : '#33c65c'
			};
		});

		this.__nodes.update(nodes);
		this.__edges.update(edges);
	};

	Grapher.prototype.connect = function(endpoint, options){
		if(!options){ options = {}; }

		var ws = new WebSocket((options.secure ? 'wss://' : 'ws://') + endpoint + (options.port ? ':' + options.port : ''));

		if(options.pipe || typeof options.pipe === 'undefined'){
			this.pipe(ws);
			let parent = this;
			ws.addEventListener('close', function(){
				parent.unpipe();
			});
		}
		return this;
	};

	Grapher.prototype.pipe = function(websocket, force){
		if(this.__piped && !force){
			throw new Error('Graph already piped');
		}

		var parent = this;
		websocket.addEventListener('message', function(data){
			var message = JSON.parse(data.data);
			if(message.refresh){
				parent.__nodes.update(message.nodes);
				parent.__edges.update(message.edges);
				return;
			}

			parent.__nodes.add(message.nodes);
			parent.__edges.add(message.edges);
		});
		this.__piped = websocket;
		return this;
	};

	Grapher.prototype.unpipe = function(disconnect){
		if(typeof disconnect === 'undefined'){
			disconnect = true;
		}

		if(disconnect){
			try {
				this.__piped.close();
			} catch(e) {
				console.error('[UNPIPING]', e);
			}
		}

		this.__piped = false;
		return this;
	};

	Grapher.prototype.auto = function(){
		if(!this.__graph){
			console.warn('No graph, creating...');
			this.draw();
		}

		var parent = this;

		this.__graph.on('selectNode', function(event){
			parent.__resetColor();
			var nodes = parent.__graph.__data.nodes;
			var edges = parent.__graph.__data.edges;

			var selected = event.nodes[0];

			var s_edges = edges.get().filter(function(edge){
				return (edge.from !== selected && edge.to !== selected);
			});

			var linked_edges = edges.get().filter(function(e){
				return (e.to === selected || e.from === selected);
			});

			var s_nodes = nodes.get().filter(function(node){
				if(node.id === selected){
					return false;
				}

				if(linked_edges.length === 0 && node.id !== selected){
					return true;
				}

				var shared_edge = linked_edges.filter(function(edge){
					return edge.to === node.id || edge.from === node.id;
				});

				return shared_edge.length === 0;
			});

			s_edges = s_edges.map(function(edge){
				return {
					id: edge.id,
					color: edge.__orignal_color ? utils.color.hue(edge.__original_color, false) : '#46454e',
				};
			});

			s_nodes = s_nodes.map(function(node){
				return {
					id: node.id,
					color: node.__original_color ? utils.color.hue(node.__original_color, false) : '#46454e'
				};
			});

			parent.__nodes.update(s_nodes);
			parent.__edges.update(s_edges);
		});

		this.__graph.on('click', function(evt){
			if(evt.nodes.length > 0){
				return;
			}
			parent.__resetColor();
		});
		return this;
	};

	let utils = {};
	utils.color = {};
	utils.color.hue = function(color, up=true){
		return '#' + color.replace('#', '').split('').map((e, i) => {
			if(i%2 === 0){
				return Math.floor(parseInt(color.replace('#', '').substr(i, 2), 16) * (up ? 2 : 1/2)).toString(16);
			}
		}).join('');
	};
})();