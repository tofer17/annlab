'use strict';

/*
 * Husbandry
 * <ul>
 * <li>Score agents and sort (FitnessFunction)</li>
 * <li>Declare elites by amount, percent, score, combo ("at least 2, up to 5") (ElitismFunction.promotion)</li>
 * <li>Clone (amount, percent) elites into new generation (ElitismFunction.replication)</li>
 * <li>Select parents* in order,** and breed*** into new population</li>
 * <li> * SelectionFunction: Fixed amount/percent, score, or combo</li>
 * <li> ** BeddingFunction: Fixed amount...</li>
 * <li>*** BreedingFunction: produce children, up to number of parents, by fixed or random amount.</li>
 * <li>Move (amount, percent) elites into new population (ElitismFunction.salvation)</li>
 * <li>Cull old population by amount, percent, age, score, random, combo (CullingFunction)</li>
 * </ul>
 */


/**
 * Receives a number and padding-amount and returns a padded array: <br/>
 *
 * <pre>
 * 2.13023493 -&gt; [2,1,3,0,2,3,4,9,3,0,0,0,0,0,0,0,0,0,0,0]
 * </pre>
 *
 * @param number
 *            Any number just not null or kaboom.
 * @param padding
 *            Number of zeroes to pad at the end; MUST be supplied.
 * @returns An array of integers padding-amount in length.
 */
function numberToDNA ( number, padding ) {
	return number.toFixed( padding ).replace( ".", "" ).split("");
}


/**
 * Receives an array of integers and sequences it into a number at least 0.0 and less than 10.0:
 *
 * <pre>
 * [2,1,3,0,2,3,4,9,3,0,0,0,0,0,0,0,0,0,0,0] -&gt; 2.13023493
 * </pre>
 *
 * @param dna
 *            An array of integers all of which will be parsed into a float.
 * @returns a float at least 0.0 and less than 10.0.
 */
function dnaToNumber ( dna ) {
	return parseFloat( dna.join("").slice( 0, 1 ) + "." + dna.join("").substring(1) );
}


/**
 * Generates count amount of unique random numbers at least minimum and less than a maximum. <code>Math.random()</code>
 * is used. <code>randomNumbers( 3, 0, 2 ) -> [2,0,1]</code>
 *
 * @param count
 *            The number of random numbers to generate.
 * @param min
 *            The minimum "at least" value.
 * @param max
 *            The maximum "less than" value.
 * @returns An array of unique integers count-long.
 */
function randomNumbers ( count, min, max ) {

	const ret = Array( count );

	for ( let i = 0; i < count; i++ ) {
		const t = min + Math.floor( Math.random() * ( max - min ) );
		if ( ret.indexOf( t ) == -1 ) {
			ret[ i ] = t;
		} else {
			i--;
		}
	}

	return ret;
}

/**
 * Splits supplied value into array of floats. The Value can be delimited any combination of:<ul>
 * <li>, : coma</li>
 * <li> : space</li>
 * <li>\t : tab</li>
 * <li>| : pipe</l></ul> It does this by simply replacing everything with a | and splitting on that.
 * @param value
 * @returns an array of floats
 */
function splitFloats ( value ) {

	while ( value.indexOf(" ") >= 0 ) value = value.replace( " ", "|" );
	while ( value.indexOf("\t") >= 0 ) value = value.replace( "\t", "|" );
	while ( value.indexOf(",") >= 0 ) value = value.replace( ",", "|" );

	const ret = value.split( "|" );

	for ( let i = 0; i < ret.length; i++ ) {
		ret[i] = parseFloat( ret[i] );
	}

	return ret;
}

/**
 * SingletonObjects permit a subclass to act like a singleton object.
 */
class SingletonObject extends Object {
	constructor () {
		super();
	};

	get displayName () {
		return this.name || this.constructor.name;
	}

	static get instance () {
		if ( ! this.instances ) {
			this.instances = new SingletonObject();
			this.instances.defaultInstance = this.name;
		}
		return this.instances;
	};

	/**
	 * Subclasses should "register" themselves so they can be seen by "forName". If "asDefault" is true;
	 * then the instance will be returned by forName when a name isn't given.
	 */
	static register ( instance, asDefault ) {
		this.instance[ instance.name ] = new instance();
		if ( asDefault ) {
			this.instances.defaultInstance = instance.name;
		}
	};

	/**
	 * Retrieves an instance so-named.
	 */
	static forName ( name ) {
		return this.instance[ name != null ? name : this.instances.defaultInstance ];
	};
}


/**
 * Class for Activation Functions to subclass.
 * @extends Object
 */
class Activator extends SingletonObject {
	constructor () {
		super();
		this.name = "Identity";
	};

	/**
	 * The base Activator function returns the neuron's bias-- this is typically used for input-layer neurons.
	 *
	 * @param The
	 *            neuron that the activator should activate upon.
	 * @return A float adhering to the activator function.
	 */
	activate ( neuron ) {
		return neuron.bias;
	};
}
Activator.register( Activator );

/**
 * The Linear Activator simply adds the bias to the sum all inputs weighted (input[i] * weight[i]).
 */
class LinearActivator extends Activator {
	constructor () {
		super();
		this.name = "Linear";
	};

	activate ( neuron ) {

		let input = 0.0;

		for ( let i = 0; i < neuron.inputs.length; i++ ) {
			input += neuron.inputs[i].output * neuron.weights[i];
		}

		return 1.0 / (1.0 + ( input + neuron.bias ) );
		//return input + neuron.bias;
	};
}
Activator.register( LinearActivator );


/**
 * The Step Activator cmputes the weighted sum of inputs and produces a 1.0 if the sum is greater than or equal to the
 * bias.
 */
class StepActivator extends Activator {
	constructor () {
		super();
		this.name = "Step";
	};

	activate ( neuron ) {
		let input = 0.0;

		for ( let i = 0; i < neuron.inputs.length; i++ ) {
			input += neuron.inputs[i].output * neuron.weights[i];
		}

		return input >= neuron.bias ? 1.0 : 0.0;
	};
}
Activator.register( StepActivator );


/**
 * The Sigmoid Activator applies an exponent to the weighted sum of the inputs; this activator does not use bias. The function is (where <code>input</code> is the sum of weighted inputs):
 * <pre>1.0 / (1.0 + Math.exp( -1 * input ) )</pre>
 */
class SigmoidActivator extends Activator {
	constructor () {
		super();
		this.name = "Sigmoid";
	};

	activate ( neuron ) {
		let input = 0.0;

		for ( let i = 0; i < neuron.inputs.length; i++ ) {
			input += neuron.inputs[i].output * neuron.weights[i];
		}

		return 1.0 / (1.0 + Math.exp( -1 * input ) );
	};
}
Activator.register( SigmoidActivator );


/**
 * An Artificial representation of a biological-like neuron.
 */
class Neuron extends Object {

	constructor ( id, activatorName, bias ) {
		super();

		this.bias = bias != null ? bias : Math.random();
		this.lastOutput = 0.0;

		this.elite = false;
		this.selected = false;

		this.inputs = [];
		this.weights = [];
		this.activatorName = activatorName != null ? activatorName : "LinearActivator";
		this.activator = Activator.forName( this.activatorName );
		this.outputs = [];

		this.padding = 19;
	};

	get dna () {
		let dna = [ numberToDNA( this.bias, this.padding ) ];
		for ( let weight of this.weights ) {
			dna.push( numberToDNA( weight, this.padding ) );
		}
		return dna;
	};

	set dna ( dna ) {
		this.bias = dnaToNumber( dna[0] );
		dna.shift();

		for ( let i = 0; i < this.weights.length; i++ ) {
			this.weights[i] = dnaToNumber( dna[ 0 ] );
			dna.shift()
		}
	};

	get output () {
		this.lastOutput = this.activator.activate( this );
		return this.lastOutput;
	};

	outputTo ( ...neurons ) {
		for ( let neuron of neurons ) {
			this.outputs.push( neuron );
			neuron.inputFrom( this );
		}
	};

	inputFrom ( neuron ) {
		this.inputs.push( neuron );
		this.weights.push( Math.random() );
	};

}


/**
 * An Agent is an individual Artificial Neural Network (ANN). It has an id, age and set of layers: the first layer (0)
 * is the Input Layer and the last layer (layers.length - 1) is the output layers; layers between comprise the
 * hidden-layers.
 */
class Agent extends Object {
	constructor ( id ) {
		super();
		this.id = id;
		this.gen = 0;

		this.lastOutput = 0.0;
		this.lastScore = 0.0;

		this.layers = [];
	};

	get dna () {
		let dna = [];

		for ( let layer of this.layers ) {
			for ( let neuron of layer ) {
				dna.push( ...neuron.dna );
			}
		}

		return dna;
	};

	set dna ( dna ) {
		for ( let layer of this.layers ) {
			for ( let neuron of layer ) {
				neuron.dna = dna;
			}
		}

		this.gen++;
	};

	get output () {
		const ret = [];
		for ( let neuron of this.layers[ this.layers.length - 1 ] ) {
			ret.push( neuron.output );
		};

		this.lastOutput = ret;
		return ret;
	};

	/**
	 * For the given layer, it will set its neuron's bias based on those given. This is typically used to set the
	 * agent's input (0) layer's input values.
	 */
	setBiases( layerIndex, ...biases ) {
		for ( let i = 0; i < biases.length; i++ ) {
			this.layers[ layerIndex ][ i ].bias = biases[ i ];
		}

		return this;
	};

	get inputBiases () {
		const ret = [];
		for ( let neuron of this.layers[0] ) {
			ret.push( neuron.bias );
		}

		return ret;
	};

	set inputBiases ( biases ) {
		for ( let i = 0; i < this.layers[0].length; i++ ) {
			this.layers[0][i].bias = biases[i];
		}
	};

	get outputBiases () {
		const ret = [];
		for ( let neuron of this.layers[ this.layers.length - 1 ] ) {
			ret.push( neuron.bias );
		}
		return ret;
	};

	set outputBiases ( biases ) {
		const outputLayer = this.layers[ this.layers.length - 1 ];
		for ( let i = 0; i < outputLayer.length; i++ ) {
			outputLayer[i].bias = biases[i];
		}
	};


	/**
	 * Crisscross linkage <b>all neurons</b> of each supplied layer (array of neurons) to each other.
	 */
	linkLayer ( layerIn, layerOut ) {
		if ( layerIn.uplink == 1 ) {
			// Modulated Filter 1-to-1
			// HOWEVER, needs to modulate most to least
			if ( layerIn.length >= layerOut.length ) {
				for ( let i = 0; i < layerIn.length; i++ ) {
					layerIn[ i ].outputTo( layerOut[ i % layerOut.length ] );
				}
			} else {
				// Modulate the other way
				for ( let i = 0; i < layerOut.length; i++ ) {
					layerIn[ i % layerIn.length ].outputTo( layerOut[ i ] );
				}
			}

		} else { // ( layerIn.uplink == null || layerIn.uplink == 0 ) {
			// Crisscross
			for ( let neuron of layerIn ) {
				neuron.outputTo( ...layerOut );
			}
		}

	};

	/**
	 * Creates a new layer of count-neurons, using the supplied activator and bias; it will automatically link
	 * (crisscross) the layer to previous layers if any.
	 */
	addLayer ( count, activatorName, bias, uplink ) {

		if ( uplink == null ) {
			uplink = 0;
		}

		const layerIndex = this.layers.length;
		const layer = [];
		layer.uplink = uplink;

		this.layers.push( layer );

		for ( let i = 0; i < count; i++ ) {
			const neuron = new Neuron(
				this.id + ":" + layerIndex + ":" + i,
				activatorName,
				bias != null ? bias[ i ] : null
			);

			layer.push( neuron );
		}

		if ( layerIndex > 0 ) {
			this.linkLayer( this.layers[ layerIndex - 1 ], layer );
		}

		return this;
	};

	/**
	 * Creates a copy of the agent preserving DNA *unless* it's a prototype.
	 */
	replicate ( id ) {

		const agent = new Agent( id );

		if ( !this.id == "P" ) {
			agent.dna = this.dna;
		} else {

			for ( let layer of this.layers ) {
				const neuron = layer[0];
				agent.addLayer( layer.length, neuron.activator.constructor.name );
			}

		}

		return agent;
	};
}


class FitnessFunction extends SingletonObject {
	constructor () {
		super();
	};

	scoreAgent ( agent, targets ) {
		let score = 0.0;
		const outputs = agent.output;
		for ( let i = 0; i < targets.length; i++ ) {
			score += Math.abs( targets[i] - outputs[i] );
		}

		agent.lastScore = score;
		return score;
	};

	scorePopulation ( population, targets ) {
		let best = null;
		let worst = null;
		let lowest = null;
		let highest = null;

		const startTime = Date.now();
		for ( let agent of population ) {
			const score = this.scoreAgent( agent, targets );

			if ( best == null || score < best.lastScore ) {
				best = agent;
			}

			if ( worst == null || score > worst.lastScore ) {
				worst = agent;
			}

			if ( lowest == null || score < lowest.lastScore ) {
				lowest = agent;
			}

			if ( highest == null || score > highest.lastScore ) {
				highest = agent;
			}
		}
		const endTime = Date.now();

		return { agents : population.length,
			best : best, worst : worst,
			highest : highest, lowest : lowest,
			start : startTime, end : endTime, run : endTime - startTime };
	};

}
FitnessFunction.register( FitnessFunction );

/**
 * Elitism marks agents in the population as elites (special) that
 * a) Get cloned (to the new population)
 * b) Stick around to be bred
 * c) And don't get culled
 */
class ElitismFunction extends SingletonObject {
	constructor () {
		super();
	};

	/**
	 * Marks agents that meet the criteria as elites; returns an array.
	 */
	promotion ( population, criteria ) {
		const ret = [];
		for ( let agent of population ) {
			// FIXME: "2" is hardcoded and needs to adhere to criteria given.
			if ( ret.length < 2 ) {
				ret.push( agent );
				agent.elite = true;
			}
		}

		return ret;
	};

	/**
	 * Replicates (clones) elites in the population according to the criteria; returns an array with the new replicants (agents).
	 */
	replication ( population, criteria ) {
		const ret = [];
		for ( let agent of population ) {
			if ( agent.elite ) {
				; // FIXME: do something.
			}
		}

		return ret;
	};

	/**
	 * Removes elites that meet the criteria from the population and returns them in a new array.
	 */
	salvation ( population, criteria ) {
		// FIXME: This does absolutely nothing at all whatsoever.
		return [];
	};

}
ElitismFunction.register( ElitismFunction );


/**
 * The Sorting Function, uhm, sorts... sort'a mostly all it does.
 */
class SortingFunction extends SingletonObject {
	/**
	 * Doesn't do anything perceptible.
	 */
	sort ( population, criteria ) {
		return population;
	};
}
SortingFunction.register( SortingFunction );

class AscendingSortingFunction extends SortingFunction {
	/**
	 * Basic ascending in-place sort on lastScore.
	 */
	sort ( population, criteria ) {

		population.sort(
			( o1, o2 ) => {
				return o1.lastScore == o2.lastScore ? 0 : ( o1.lastScore > o2.lastScore ? 1 : -1 );
		});

		return population;
	};
}
SortingFunction.register( AscendingSortingFunction, true );

/**
 * The Selection Function marks agents in a population as parents for breeding based on a criteria.
 */
class SelectionFunction extends SingletonObject {
	/**
	 * The default behavior is to select all.
	 */
	select ( population, criteria ) {
		for ( let agent of population ) {
			agent.selected = true;
		}

		return population;
	};
}
SelectionFunction.register( SelectionFunction );


/**
 * Selects a "top percentile" of agents for breeding (90%, rounded, by default).
 */
class TopPercentileSelectionFunction extends SingletonObject {
	select ( population, criteria ) {

		if ( criteria == null || criteria.percentage == null ) {
			criteria = { percentage : 0.9 };
		}

		const cut = Math.round( population.length * criteria.percentage );
		const ret = new Array( cut );

		for ( let i = 0; i < population.length; i++ ) {
			population[i].selected = i <= cut;
			if ( i <= cut ) {
				ret.push( population[i] );
			}
		}

		return ret;
	};
}
SelectionFunction.register( TopPercentileSelectionFunction );

/**
 * The Bedding Function groups parents. Typically into groups of 2 (default), however, possibly more, and based on criteria.
 */
class BeddingFunction extends SingletonObject {

	static canBed ( i, n, population ) {
		for ( i; i < i + n; i++ ) {
			if ( !popultion[ i ].selected ) {
				return false;
			}
		}
	};

	bedPopulation ( population, criteria ) {

		if ( criteria == null || criteria.count == null ) {
			criteria = { count : 2 };
		}

		const ret = [];

		for ( let i = 0; i < population.length; i += criteria.count ) {
			if ( i + criteria.count - 1 < population.length && BeddingFunction.canBed( i , criteria.count, population ) ) {

				const bed = [];

				for ( let j = i; j < i + criteria.count; j++ ) {
					bed.push( population[ j ] );
				}

				ret.push( bed );
			}
		}

		return ret;
	}
}
BeddingFunction.register( BeddingFunction );

/**
 * The Crossover Function merges DNA between parents (producing as many copies as parents). Possible
 * functions (subclasses) are:<ul>
 * <li>Uniform</li>
 * <li>kPoint</li>
 * </ul>
 * ...such that the default is Uniform.
 */
class CrossoverFunction extends SingletonObject {
}
CrossoverFunction.register( CrossoverFunction );


/**
 * The Mutation Function mutates DNA in unimaginable radioactive ways.
 */
class MutationFunction extends SingletonObject {
}
MutationFunction.register( MutationFunction );


/**
 * The Breeding Function actually performs the breeding steps of crossover and mutation to produce 1 or more offspring.
 * The differential has to do with how many offspring to produce.
 */
class BreedingFunction extends SingletonObject {
}
BreedingFunction.register( BreedingFunction );

/**
 * The Culling Function tears through the population and kills off agents based on gruesome criteria.
 */
class CullingFunction extends SingletonObject {
}
CullingFunction.register( CullingFunction );


class ANNLab extends Object {
	constructor () {
		super();

		this._node = null;

		this.elites = 3;
		this.breedScore = 0.0;// 001;
		this.agentCount = 100;
		this.crossoverCount = Math.round( 20 * 0.5 );
		this.crossoverChance = 0.9;
		this.mutationChance = 0.0001;
		this.runs = 0;

		this.sortingFunction = SortingFunction.forName();
		this.fitnessFunction = FitnessFunction.forName();
		this.elitismFunction = ElitismFunction.forName()

		this.protoAgent = new Agent( "P" )
			.addLayer( 2, "Activator", [ 0.2, 0.5 ] )//x x
			.addLayer( 4, "SigmoidActivator", null, 1 )
			.addLayer( 3 )
			.addLayer( 1, "SigmoidActivator", [ 0.7 ] );

		//this.target = [ 0.7 ];

		this.agents = [];
		for ( let i = 0; i < this.agentCount; i++ ) {
			this.agents.push( this.protoAgent.replicate( i ) );
//			const agent = new Agent( i );
//			this.agents.push( agent );
//
//			agent.addLayer( 2, "Activator" );
//			agent.addLayer( 4, "SigmoidActivator" );
//			agent.addLayer( 3 );
//			agent.addLayer( 1, "SigmoidActivator" );
		}

		if ( 1 == 2 ) {
			console.log( this.agents[0] );
			var dna = this.agents[0].dna;
			console.log( dna );
			console.log( this.agents[0].output, this.agents[1].output );

			this.agents[1].dna = dna;
			console.log( this.agents[1].dna );
			console.log( this.agents[0].output, this.agents[1].output );
			return;
		}

	};

	runGens ( n = 100 ) {
		this.incarnateProtoAgent();
		this.agents = [];

		for ( let i = 0; i < this.agentCount; i++ ) {
			this.agents.push( this.protoAgent.replicate( i ) );
		}

		this.node.progress.value = 0;
		this.node.progress.max = n;
		let i = 0;

		Promise.resolve().then( ()=>{
			for ( i = 0; i < n; i ++ ) {
				setTimeout( this.runGen.bind(this), 0 );
			}
		});

	};

	runGen () {
		this.node.progress.value++;

		//let run = this.run( this.target, 0.5, 0.2 );
		let run = this.run();

		this.sortingFunction.sort( this.agents )

		let MuTAt3 = 0;

		for ( let i = this.elites; i < this.agents.length; i += 2 ) {
			if ( i + 1 < this.agents.length ) {
				const agentA = this.agents[ i ];
				if ( agentA.lastScore <= this.breedScore ) {
					i--;
					continue;
				}
				const agentB = this.agents[ i + 1 ];
				MuTAt3 += this.copulate( agentA, agentB );
			}
		}

		const div = this._node.querySelector( "pre" );
		div.innerHTML = this.runs + "\n" + run + "\nMuTAt3 " + MuTAt3;
	}

	copulate ( agentA, agentB ) {

		let dnaA = agentA.dna;
		let dnaB = agentB.dna;

		let MuTAt3 = 0;

		for ( let i = 0; i < dnaA.length; i++ ) {
			let partA = dnaA[ i ];
			let partB = dnaB[ i ];

			// MuTAt3 += this.uniformCrossover( partA, partB );
			MuTAt3 += this.pointCrossover( partA, partB );
			// MuTAt3 += this.kPointCrossover(4, partA, partB );
		}

		agentA.dna = dnaA;
		agentB.dna = dnaB;

		return MuTAt3;
	};

	kPointCrossover ( k, dnaA, dnaB ) {
		let MuTAt3 = 0;
		for ( let i = 0; i < k; i++ ) {
			MuTAt3 += this.pointCrossover( dnaA, dnaB );
		}

		return MuTAt3;
	};

	pointCrossover ( dnaA, dnaB ) {
		const p = Math.floor( Math.random() * dnaA.length );

		let MuTAt3 = 0;

		for ( let i = p; i < dnaA.length; i++ ) {
			if ( Math.random() <= this.crossoverChance ) {
				const tmp = dnaA[i];
				dnaA[ i ] = dnaB[ i ];
				dnaB[ i ] = tmp;
			}
			if ( Math.random() <= this.mutationChance ) {
				MuTAt3++;
				if ( Math.random() < 0.5 ) {
					dnaA[ i ] = Math.round( dnaA[ i ] * Math.random() );
				} else {
					dnaB[ i ] = Math.round( dnaB[ i ] * Math.random() );
				}
				// console.warn("MuTAt3!")
			}
		}
		return MuTAt3;
	};

	uniformCrossover ( dnaA, dnaB ) {

		const rn = randomNumbers( this.crossoverCount, 0, dnaA.length );

		let MuTAt3 = 0;

		for ( let i of rn ) {
			if ( Math.random() <= this.crossoverChance ) {
				const tmp = dnaA[ i ];
				dnaA[ i ] = dnaB[ i ];
				dnaB[ i ] = tmp;
			}
			if ( Math.random() <= this.mutationChance ) {
				MuTAt3++;
				if ( Math.random() < 0.5 ) {
					dnaA[ i ] = Math.round( dnaA[ i ] * Math.random() );
				} else {
					dnaB[ i ] = Math.round( dnaB[ i ] * Math.random() );
				}
				// console.warn("MuTAt3!")
			}
		}
		return MuTAt3;
	};

	//run ( targetScores, ...inputBiases ) {
	run () {

		const inputBiases = this.protoAgent.inputBiases;
		for ( let agent of this.agents ) {
			//agent.setBiases( 0, ...inputBiases );
			agent.inputBiases = inputBiases;
		}

		//const runResult = this.fitnessFunction.scorePopulation( this.agents, targetScores );
		const runResult = this.fitnessFunction.scorePopulation( this.agents, this.protoAgent.outputBiases );

		this.runs ++;

		return [ [ runResult.best.lastScore, runResult.worst.lastScore ],
			[ runResult.lowest.lastScore, runResult.highest.lastScore ],
			[ runResult.start, runResult.end, runResult.run ] ];
	};

	incarnateProtoAgent () {
		console.log( this.node.protoDiv );

		const protoAgent = new Agent( "P" );

		const inputDiv = this.node.protoDiv.querySelector( "#input" );
		const inputCount = parseInt( inputDiv.querySelector( "#count" ).value );
		const inputUplink = inputDiv.querySelector( "#uplink" ).selectedIndex;
		const inputBiases = splitFloats( inputDiv.querySelector( "#biases" ).value );

		protoAgent.addLayer( inputCount, "Activator", inputBiases, inputUplink );

		let i = 1;
		let hiddenLayer = this.node.protoDiv.querySelector( "#hidden" + i++ );
		while ( hiddenLayer != null ) {
			const hiddenCount = parseInt( hiddenLayer.querySelector( "input" ).value );
			const hiddenUplink = hiddenLayer.querySelector( "#uplink" ).selectedIndex;
			const activatorName = hiddenLayer.querySelector( "#activator" ).value;
 			protoAgent.addLayer( hiddenCount, activatorName, null, hiddenUplink );
			console.log(i, hiddenCount, activatorName );
			hiddenLayer = this.node.protoDiv.querySelector( "#hidden" + i++ );
		}

		const outputDiv = this.node.protoDiv.querySelector( "#output" );
		const outputCount = parseInt( outputDiv.querySelector( "#count" ).value );
		const outputActivatorName = outputDiv.querySelector( "#activator" ).value;
		const outputBiases = splitFloats( outputDiv.querySelector( "#biases" ).value );

		protoAgent.addLayer( outputCount, outputActivatorName, outputBiases );

		console.log( "New Proto-agent:", protoAgent );

		this.protoAgent = protoAgent;
		return protoAgent;
	};

	get node () {
		return this._node || this.init();
	};

	init () {
		const node = document.getElementById( "annlab" );

		node.appendChild(document.createElement("pre"));

		node.rolls = node.querySelectorAll( "h2 span" );
		for ( let roll of node.rolls ) {
			roll.addEventListener( "click", (e)=>{
				const d = e.target.parentElement.nextSibling;
				d.style.display = d.style.display == "none" ? "" : "none";
				e.target.innerHTML = d.style.display == "none" ? "[ + ]" : "[ - ]";
			});
		}

		node.elites = node.querySelector( "#eliteCount" );
		node.elites.value = this.elites;
		node.elites.addEventListener( "change", (e)=>{ this.elites = parseInt( e.target.value ); } );

		node.breedScore = node.querySelector( "#breedScore" );
		node.breedScore.value = this.breedScore;
		node.breedScore.addEventListener( "change", (e)=>{ this.breedScore = parseFloat( e.target.value ); } );

		node.agentCount = node.querySelector( "#agentCount" );
		node.agentCount.value = this.agentCount;
		node.agentCount.addEventListener( "change", (e)=>{ this.agentCount = parseInt( e.target.value ); } );

		node.crossoverCount = node.querySelector( "#xoverPercent" );
		node.crossoverCount.value = 100 * (this.crossoverCount / 20.0 );
		node.crossoverCount.addEventListener( "change", (e)=>{ this.crossoverCount = Math.round(20.0 * (e.target.value/100.0) ); } );

		node.crossoverChance = node.querySelector( "#xoverChance" );
		node.crossoverChance.value = 100.0 * this.crossoverChance;
		node.crossoverChance.addEventListener( "change", (e)=>{ this.crossoverChance = e.target.value / 100.0; } );

		node.crossoverFunction = node.querySelector( "#xoverFunction" );
		node.crossoverFunction.disabled = true;
		// node.crossoverFunction.value = "Single"
		// node.crossoverFunction.addEventListener( "change", (e)=>{
		// this.crossoverChance = e.target.value/100.0; } );

		node.crossoverBias = node.querySelector( "#xoverBias" );
		node.crossoverBias.disabled = true;

		node.mutationChance = node.querySelector( "#mutationChance" );
		node.mutationChance.value = 100.0 * this.mutationChance;
		node.mutationChance.addEventListener( "change", (e)=>{ this.mutationChance = e.target.value / 100.0; } );

		node.mutationFunction = node.querySelector( "#mutationFunction" );
		node.mutationFunction.disabled = true;

		node.mutateBias = node.querySelector( "#mutateBias" );
		node.mutateBias.disabled = true;

		node.step1 = node.querySelector( "#step1" );
		node.step1.addEventListener( "click", (e)=>{
			Promise.resolve().then( (e)=>{this.runGens( 1 ); });
		});

		node.step100 = node.querySelector( "#step100" );
		node.step100.addEventListener( "click", (e)=>{
			Promise.resolve().then( (e)=>{this.runGens( 100 ); });
		});

		node.step1000 = node.querySelector( "#step1000" );
		node.step1000.addEventListener( "click", (e)=>{
			Promise.resolve().then( (e)=>{this.runGens( 1000 ); });
		});

		node.progress = node.querySelector( "progress" );

		node.protoDiv = node.querySelector( "#protodiv" );
		this.updateProtoDiv( node.protoDiv );

		this._node = node;
		return this._node;
	};

	updateProtoDiv ( div ) {
		div.innerHTML = "";

		div.inputDiv = this.makeInputProto( this.protoAgent );
		div.appendChild( div.inputDiv );

		div.hiddenDivs = [];
		for ( let i = 1; i < this.protoAgent.layers.length - 1; i++ ) {
			const hiddenDiv = this.makeHiddenProto( i, this.protoAgent );
			div.hiddenDivs.push( hiddenDiv );
			div.appendChild( hiddenDiv );
		}

		div.outputDiv = this.makeOutputProto( this.protoAgent );
		div.appendChild( div.outputDiv );

		const hr = document.createElement( "hr" );
		hr.classList.add( "clr" );

		div.appendChild( hr );

	};

	makeOutputProto( protoAgent ) {
//	<div class="protolayer">
//		<span>Outputs</span>
//		<input type="number" min="1" step="1" value="1" />
//		<select><option>Linear</option></select>
//		<input style="width: 8em" value="0.7" />
//	</div>

		const outputLayer = protoAgent.layers[ protoAgent.layers.length - 1 ];

		const div = document.createElement( "div" );
		div.id = "output";
		div.classList.add( "protolayer" );

		const span = document.createElement( "span" );
		span.innerHTML = "Outputs";

		const count = document.createElement( "input" );
		count.id = "count";
		count.type = "number";
		count.min = 1;
		count.step = 1;
		count.value = outputLayer.length;

		const uplink = document.createElement( "select" );
		uplink.id = "uplink";
		uplink.disabled = true;
		uplink.innerHTML = "<option>n/a</option>";

		const sel = this.makeActivatorSelect( outputLayer[0].activator.constructor.name );

		const inp = document.createElement( "input" );
		inp.id = "biases";
		inp.style.width = "8em";
		inp.value = "0.7";

		div.appendChild( span );
		div.appendChild( count );
		div.appendChild( uplink );
		div.appendChild( sel );
		div.appendChild( inp );

		return div;
	};

	makeActivatorSelect ( selectedActivator ) {

		const activatorNames = [];

		for ( let activatorName in Activator.instances ) {
			if ( activatorName != "defaultInstance" ) {
				activatorNames.push( activatorName );
			}
		}

		activatorNames.sort();

		const sel = document.createElement( "select" );
		sel.id = "activator";

		for ( let activatorName of activatorNames ) {
			const opt = document.createElement( "option" );
			opt.value = activatorName;
			opt.innerHTML = Activator.forName( activatorName ).displayName;
			opt.selected = activatorName == selectedActivator;
			sel.add( opt );
		}

		return sel;
	};

	makeUplinkSelect ( selectedUplink ) {
		const sel = document.createElement( "select" );
		sel.id = "uplink";

		sel.add( document.createElement( "option" ) )
		sel.add( document.createElement( "option" ) )

		sel.options[0].innerHTML = "X";
		sel.options[1].innerHTML = "-";
		sel.options[ selectedUplink != null ? selectedUplink : 0 ].selected = true;

		return sel;
	};

	protoButtonListener ( event ) {
		console.error( event.target.id );
	};

	makeHiddenProto ( index, protoAgent ) {
//	<div class="protolayer">
//		<span>Hidden</span>
//		<input type="number" min="1" step="1" value="4" />
//		<select><option>Sigmoid</option></select>
//		<button>^</button>
//		<button>+</button>
//		<button>X</button>
//		<button>v</button>
//	</div>

		const div = document.createElement( "div" );
		div.id = "hidden" + index;
		div.classList.add( "protolayer" );

		const span = document.createElement( "span" );
		span.innerHTML = "Hidden";

		const count = document.createElement( "input" );
		count.type = "number";
		count.min = 1;
		count.step = 1;
		count.value = protoAgent.layers[ index ].length;

		const uplink = this.makeUplinkSelect( this.protoAgent.layers[ index ].uplink );

		const sel = this.makeActivatorSelect( protoAgent.layers[ index ][ 0 ].activator.constructor.name );

		const btnUp = document.createElement( "button" );
		btnUp.id = "up" + index;
		btnUp.innerHTML = "^";

		const btnAdd = document.createElement( "button" );
		btnAdd.id = "add" + index;
		btnAdd.innerHTML = "+";

		const btnDel = document.createElement( "button" );
		btnDel.id = "del" + index;
		btnDel.innerHTML = "X";

		const btnDown = document.createElement( "button" );
		btnDown.id = "down" + index;
		btnDown.innerHTML = "v";

		div.appendChild( span );
		div.appendChild( count );
		div.appendChild( uplink );
		div.appendChild( sel );
		div.appendChild( btnUp );
		div.appendChild( btnAdd );
		div.appendChild( btnDel );
		div.appendChild( btnDown );

		btnUp.addEventListener( "click", (e)=>{ this.protoButtonListener(e); } );
		btnAdd.addEventListener( "click", (e)=>{ this.protoButtonListener(e); } );
		btnDel.addEventListener( "click", (e)=>{ this.protoButtonListener(e); } );
		btnDown.addEventListener( "click", (e)=>{ this.protoButtonListener(e); } );

		return div;
	};

	makeInputProto ( protoAgent ) {

//	<div class="protolayer">
//		<span>Inputs</span><input type="number" min="1" step="1" value="2" /><select
//			disabled><option>Activator</option></select><input
//			style="width: 8em" value="0.2,0.5" />
//	</div>

		const div = document.createElement( "div" );
		div.id = "input";
		div.classList.add( "protolayer" );

		const span = document.createElement( "span" );
		span.innerHTML = "Inputs";

		const count = document.createElement( "input" );
		count.id = "count";
		count.type = "number";
		count.min = 1;
		count.step = 1;
		count.value = protoAgent.layers[0].length;

		const uplink = this.makeUplinkSelect( this.protoAgent.layers[0].uplink );

		const sel = document.createElement( "select" );
		sel.disabled = true;
		sel.innerHTML = "<option>Identity</option>";

		const inp = document.createElement( "input" );
		inp.id = "biases";
		inp.style.width = "8em";
		inp.value = "0.2,0.5";

		div.appendChild( span );
		div.appendChild( count );
		div.appendChild( uplink );
		div.appendChild( sel );
		div.appendChild( inp );

		return div;
	};
}


function load ( event ) {
	window.annlab = new ANNLab();
	document.body.appendChild( window.annlab.node );
// Promise.resolve().then(()=>{
// for ( let i = 0; i < 1; i++ ) {
// window.nn.runGen();
// }
// });

// window.setTimeout( ()=>{
// for ( let i = 0; i < 100; i++ ) {
// window.nn.runGen();
// }
// }, 800);
}

window.addEventListener( "load", load, false );
