;(function(){
	Workshop.http = function(params){
		let func = function(resolve, reject){
			Workshop.ajax(params, function(err, res, xhr){
				if(err){
					return reject(err);
				}
				return resolve({
					response: res,
					xhr: xhr
				});
			});
		}
		return new Promise(func);
	};

	function createGraph(elements, semester){

		if(!elements.container){
			throw new Error('Elements must AT LEAST contain a container element');
		}

		let exec = {};

		let semesters = ['P12', 'A12', 'P13', 'A13','P14', 'A14', 'P15', 'A15','P16', 'A16', 'P17', 'A17'];

		if(elements.forceAtlas){
			elements.forceAtlas.addEventListener('click', function(e){
				e.preventDefault();
				if(!exec.graph){return console.warn('NO GRAPH');}

				exec.graph.stabilize(100);
			});
		}

		if(elements.semester){
			elements.semester.addEventListener('input', function(event){
				document.querySelector('.title span').innerText = semesters[this.value];
				return makeGraph(semesters[this.value]);
			});
		}

		function getData(name){
			return Workshop.http({
				url : location.protocol + '//' + location.host + '/data/'+name+'.json',
				method: 'GET'
			});
		}

		let data = {
			assos: null,
			membres:null,
			users: null
		};

		getData('assos').then(assos => {
			data.assos = JSON.parse(assos.response);
			return getData('membres');
		}).then(membres => {
			data.membres = JSON.parse(membres.response);
			return getData('users');
		}).then(users => {
			data.users = JSON.parse(users.response);
			initGraph(data);
		}).catch(e => {
			console.error(e);
			alert('ERROR MOTHAFUCKA');
		});

		function initGraph(data){
			let options = {
				width:'100%',
				height: '100%',
			};

			let container = elements.container;

			let graph = new vis.Network(container, {
				nodes: [],
				edges: []
			}, {
				layout:{improvedLayout: false},
				physics:{
					enabled:false,
					solver: 'forceAtlas2Based'
				}
			});
			exec.graph = graph;

			graph.addEventListener('selectNode', function(evt){
				let node = evt.nodes[0];
				if(!node || isNaN(parseInt(node))){
					return;
				}

				let edge_update = [];
				let keep_nodes = [];
				exec.graph.data.edges.get().forEach( e => {
					if(e.from === node || e.to === node){
						return;
					}

					edge_update.push({
						id: e.id,
						color: '#ebebeb'
					});
					keep_nodes.push(e.from, e.to);
				});
				exec.graph.data.edges.update(edge_update);

				let nodes_update = [];
				exec.graph.data.nodes.get().forEach(e => {
					if(keep_nodes.indexOf(e.id) > -1){
						return;
					}
					nodes_update.push({
						id: e.id,
						color: `#ebebeb`
					});
				});
				exec.graph.data.nodes.update(nodes_update);
			});

			return makeGraph(semester || semesters);
		}

		function resetColor(){
			
		}

		function makeGraph(age){
			console.info('Filtering semester');
			let semester = getSemester(age);
			console.info('Building nodes and edges');

			let filtered = filterData(semester); 
			let nodes = buildNodes(filtered.users, filtered.assos);
			let edges = buildEdges(filtered.users, filtered.assos, semester);

			return setData({
				nodes:nodes,
				edges: edges
			});
		}

		function getSemester(semester){
			// filtre les membres pour avoir que les roles du semestre choisi
			console.log('Before filtering', data.membres.length);
			let filtered = null;
			if(semester instanceof Array){
				filtered = data.membres.filter(e=>{return semester.indexOf(e.semester) > -1});
			} else {
				filtered = data.membres.filter(e=>{return e.semester === semester});
			}
			console.log('After filtering', filtered.length);
			return filtered;
		}

		function filterData(filtered){
			let users = data.users.filter(e => filtered.find(f=>{return f.login === e.login}) ? true : false);
			let assos = data.assos.filter(e => filtered.find(f=>{return f.asso === e.asso}) ? true : false);
			return {
				users: users,
				assos:assos
			};
		}

		function buildNodes(users, assos){
			let ct = 0;
			let dataset = new vis.DataSet();
			for(let u of users){
				dataset.add({
					id: u.login,
					label: u.name + ' ' + u.lastname
				});
				ct++;
			}

			for(let a of assos){
				dataset.add({
					id: a.id,
					label: a.asso,
					color: '#FF0000'
				});
				ct++;
			}

			console.log('TOTAL NODES', ct);
			return dataset;
		}

		function buildEdges(users, assos, membres){
			// make edges with assos --> poles and users --[type]--> asso
			let edges = new vis.DataSet();
			let ct = 0;
			for(let membre of membres){
				let asso = assos.find(e => {return e.asso === membre.asso});
				if(!asso){
					// console.warn('Asso not found', membre.asso);
					continue;
				}

				edges.add({
					from: membre.login,
					to: asso.id,
					label: membre.role
				});
				ct++;
			}

			console.log('EDGES', ct);

			return edges;
		}

		function setData(newdata){
			if(!exec.graph){
				return console.warn('NO GRAPH INITIATED');
			}

			exec.graph.setData(newdata);
			exec.graph.data = newdata;
		}

		exec.getData = function(){
			return data;
		};

		exec.setData = function(data){
			return setData(data);
		};

		exec.makeGraph = function(semester){
			return makeGraph(semester);
		};

		return exec;
	}

	window.init = function(){
		let elements = {
			mini_graphs:[
				document.querySelector('.min-1'),
				document.querySelector('.min-2'),
				document.querySelector('.min-3'),
				document.querySelector('.min-4'),
			] ,
			graph: document.querySelector('.graph-container')
		};

		let mini = ['P15', 'P17', 'A16', 'A12'];
		window.graphs = [];
		for(let i = 0; i < elements.mini_graphs.length; i++){
			console.log('Creating graph', elements.mini_graphs[i]);
			let g = createGraph({
				container: elements.mini_graphs[i]
			}, mini[i]);
			graphs.push(g);
		}

		let g = createGraph({
			container: elements.graph
		});
		graphs.push(g);
	};

	let buttons = document.querySelector('.forceatlas').children;
	for(let i = 0; i < buttons.length; i++){
		buttons[i].addEventListener('click', function(){
			window.graphs[i].graph.stabilize(100);
		});
	}

	window.init();
})();