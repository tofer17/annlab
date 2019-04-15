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
	const s = dna.join( "" );
	return parseFloat( s.slice( 0, 1 ) + "." + s.substring(1) );
}


/**
 * Stub: so that other PRNGs can be used such as crypto.randomNumbers();
 * @returns
 */
function random () {
	return Math.random();
}


/**
 * Generates count amount of unique random numbers at least minimum and less than a maximum. <code>Math.random()</code>
 * is used. <code>randomNumbers( 3, 0, 2 ) -> [2,0,1]</code>
 *
 * @param rnarr
 *            The array to fill with random numbers.
 * @param min
 *            The minimum "at least" value.
 * @param max
 *            The maximum "less than" value.
 * @returns An array of unique integers count-long.
 */
function randomNumbers ( rnarr, min, max ) {
	if ( typeof( rnarr ) == "number" ) {
		rnarr = new Array( rnarr );
	}

	for ( let i = 0; i < rnarr.length; i++ ) {
		const t = min + Math.floor( random() * ( max - min ) );
		if ( rnarr.indexOf( t ) == -1 ) {
			rnarr[ i ] = t;
		} else {
			i--;
		}
	}

	return rnarr;
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
	};

	static populateSelect ( sel, selectedInstance ) {
		const instanceNames = [];

		for ( let instanceName in this.instance ) {
			if ( instanceName != "defaultInstance" ) {
				instanceNames.push( instanceName );
			}
		}

		instanceNames.sort();

		if ( sel == null ) {
			sel = document.createElement( "select" );
		}

		for ( let instanceName of instanceNames ) {
			const opt = document.createElement( "option" );
			opt.value = instanceName;
			opt.innerHTML = this.forName( instanceName ).displayName;
			opt.selected = instanceName == selectedInstance;
			sel.add( opt );
		}

		return sel;
	};

	static makeSelectElement () {
		const sel = document.createElement( "select" );

		return sel;
	};

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
 * FIXME: Add "activated" feature
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

		// FIXME: Check if activated
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

		this.id = id;

		this.bias = bias != null ? bias : Math.random();
		this.lastOutput = null;

		this.isInput = false;
		this.isElite = false;
		this.isSelected = false;

		this.inputs = [];
		this.weights = [];
		this.activatorName = activatorName != null ? activatorName : "LinearActivator";
		this.activator = Activator.forName( this.activatorName );
		this.outputs = [];

		this.dnarr = null;
		this.padding = 19;
	};

	prepareRun ( bias ) {
		this.lastOutput = null;
		if ( bias != null ) {
			this.bias = bias;
		}
	}

	get dna () {

		if ( this.dnarr == null ) {

			this.dnarr = [ numberToDNA( this.bias, this.padding ) ];

			for ( let weight of this.weights ) {
				this.dnarr.push( numberToDNA( weight, this.padding ) );
			}
		}

		return this.dnarr;
	};

	set dna ( dna ) {

		this.bias = dnaToNumber( dna[0] );
		dna.shift();

		for ( let i = 0; i < this.weights.length; i++ ) {
			this.weights[i] = dnaToNumber( dna[ 0 ] );
			dna.shift()
		}

		this.dnarr = null;
	};

	get output () {

		if ( this.lastOutput == null ) {
			this.lastOutput = this.activator.activate( this );
		}

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
				if ( ! neuron.isInput ) {
					dna.push( ...neuron.dna );
				}
			}
		}

		return dna;
	};

	set dna ( dna ) {
		for ( let layer of this.layers ) {
			for ( let neuron of layer ) {
				if ( ! neuron.isInput ) {
					neuron.dna = dna;
				}
			}
		}

		this.gen++;
	};

	prepareRun ( inputValues ) {
		for ( let i = 0; i < inputValues.length; i++ ) {
			this.layers[ 0 ][ i ].prepareRun( inputValues[ i ] );
		}

		for ( let i = 1; i < this.layers.length; i++ ) {
			for ( let neuron of this.layers[ i ] ) {
				neuron.prepareRun();
			}
		}
	}

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
			neuron.isInput = layerIndex == 0;

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
	promote ( population, criteria ) {

		let index = 0;
		for ( let agent of population ) {
			agent.isElite = index++ < criteria.count;
		}

		return {};
	};

	/**
	 * Replicates (clones) elites in the population according to the criteria; returns an array with the new replicants (agents).
	 */
	replicate ( population, newGen, criteria ) {

		for ( let agent of population ) {
			if ( agent.isElite ) {
				newGen.add( agent.replicate() );
			}
		}

		return {};
	};

	/**
	 * Removes elites that meet the criteria from the population and returns them in a new array.
	 */
	salvate ( population, newGen, criteria ) {
		//x x
		for ( let agent of population ) {
			if ( agent.isElite ) {
				newGen.add( population.removeValue( agent ) );
			}
		}

		return {};
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
			agent.isSelected = true;
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

		let index = 0;
		for ( let agent of population ) {
			agent.isSelected = index <= cut;
			index++;
		}

//		for ( let i = 0; i < population.length; i++ ) {
//			population[i].isSelected = i <= cut;
//			if ( i <= cut ) {
//				ret.push( population[i] );
//			}
//		}

	};
}
SelectionFunction.register( TopPercentileSelectionFunction );

/**
 * The Bedding Function groups parents. Typically into groups of 2 (default), however, possibly more, and based on criteria.
 */
class BeddingFunction extends SingletonObject {

	static XcanBed ( i, n, population ) {

		for ( ; i < i + n; i++ ) {
			if ( !population.get( i ).isSelected ) {
				return false;
			}
		}
	};

	XbedPopulation ( population, criteria ) {

		if ( criteria == null || criteria.count == null ) {
			criteria = { count : 2 };
		}

		const ret = [];

		for ( let i = 0; i < population.length; i += criteria.count ) {
			if ( i + criteria.count - 1 < population.length && BeddingFunction.canBed( i , criteria.count, population ) ) {

				const bed = [];

				for ( let j = i; j < i + criteria.count; j++ ) {
					bed.push( population.get( j ) );
				}

				ret.push( bed );
			}
		}

		return ret;
	}


	static canBed ( parent ) {
		return parent.isSelected;
	};

	bedPopulation ( population, criteria ) {
		const beds = new LinkedList();

		let parentA = null;

		for ( let agent of population.values() ) {
			if ( BeddingFunction.canBed( agent ) && parentA == null ) {
				parentA = agent;
			} else if ( BeddingFunction.canBed( agent ) && parentA != null ) {
				beds.add( [ parentA, agent ] );
				parentA = null;
			}
		}

		return beds;
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

	constructor () {
		super();

		this.opts = {};
		this.opts.count = 0;
		this.opts.chance = 0.0;
		this.opts.mutationFunction = null;
	}

	/**
	 * Default is uniform: x% of the dna part has a y% chance and mutationFunction.
	 * Thus, opts is: <code>{ count : i, chance : f, mutationFunction : func </code>.
	 */
	crossover ( dnaA, dnaB ) {
		const rn = randomNumbers( this.opts.count, 0, dnaA.length );

		let MuTAt3 = 0;

		for ( let i of rn ) {
			if ( Math.random() <= this.opts.chance ) {
				const tmp = dnaA[ i ];
				dnaA[ i ] = dnaB[ i ];
				dnaB[ i ] = tmp;
			}

			if ( this.opts.mutationFunction != null ) {
				MuTAt3 += this.opts.mutationFunction.mutate( i, dnaA, dnaB );
			}
		}

		return MuTAt3;
	};
}
CrossoverFunction.register( CrossoverFunction );

class KPointCrossoverFunction extends CrossoverFunction {
	constructor () {
		super();

		this.opts.k = 1;
	};

	crossover ( dnaA, dnaB ) {

		let MuTAt3 = 0;

		for ( let i = 0; i < this.opts.k; i++ ) {
			MuTAt3 += this._crossover( dnaA, dnaB );
		}

		return MuTAt3;
	}

	_crossover ( dnaA, dnaB ) {

		const p = Math.floor( Math.random() * dnaA.length );

		let MuTAt3 = 0;

		for ( let i = p; i < dnaA.length; i++ ) {
			if ( Math.random() <= this.opts.chance ) {
				const tmp = dnaA[i];
				dnaA[ i ] = dnaB[ i ];
				dnaB[ i ] = tmp;
			}

			if ( this.opts.mutationFunction != null ) {
				MuTAt3 += this.opts.mutationFunction.mutate( i, dnaA, dnaB );
			}
		}

		return MuTAt3;
	};
}
CrossoverFunction.register( KPointCrossoverFunction );

/**
 * The Mutation Function mutates DNA in unimaginable radioactive ways.
 */
class MutationFunction extends SingletonObject {
	constructor () {
		super();

		this.opts = {};
		this.opts.chance = 0.0;
	};

	mutate ( index, dnaA, dnaB ) {

		if ( Math.random() <= this.opts.chance ) {

			if ( Math.random() < 0.5 ) {
				dnaA[ index ] = "" + Math.round( dnaA[ index ] * Math.random() );
			} else {
				dnaB[ index ] = "" + Math.round( dnaB[ index ] * Math.random() );
			}

			return 1;
		}

		return 0;
	};

}
MutationFunction.register( MutationFunction );


class AggressiveMutationFunction extends MutationFunction {
	constructor () {
		super();
	};

	mutate ( index, dnaA, dnaB ) {
		if ( Math.random() <= this.opts.chance ) {

			if ( Math.random() < 0.5 ) {
				dnaA[ index ] = "" + Math.floor( ( Math.random() * 10 ) % 10 );
			} else {
				dnaB[ index ] = "" + Math.floor( ( Math.random() * 10 ) % 10 );
			}

			return 1;
		}

		return 0;
	}
}
MutationFunction.register( AggressiveMutationFunction );

/**
 * The Breeding Function actually performs the breeding steps of crossover and mutation to produce 1 or more offspring.
 * The differential has to do with how many offspring to produce.
 */
class BreedingFunction extends SingletonObject {
	breed ( parents, newGen, crossoverFunction ) {

		let agentA = parents[0];
		let agentB = parents[1];

		let dnaA = agentA.dna;
		let dnaB = agentB.dna;

		let MuTAt3 = 0;

		for ( let i = 0; i < dnaA.length; i++ ) {
			let partA = dnaA[ i ];
			let partB = dnaB[ i ];

			MuTAt3 += crossoverFunction.crossover( partA, partB );

		}

		let childA = agentA.replicate( agentA.id );
		childA.dna = dnaA;
		newGen.add( childA );

		if ( 1 == 1 ) {
			let childB = agentB.replicate( agentB.id );
			childB.dna = dnaB;
			newGen.add( childB );
		}

		return MuTAt3;
	}
}
BreedingFunction.register( BreedingFunction );

/**
 * The Culling Function tears through the population and kills off agents based on gruesome criteria.
 */
class CullingFunction extends SingletonObject {
	cull ( population, criteria ) {
		if ( criteria == null ) {
			criteria = {};
			criteria.count = 50;
		} else if ( criteria.count == null ) {
			criteria.count = 50;
		}

		const tail = population.getNode( criteria.count - 1 );
		tail.next = null;
		population.tail = tail;
		population.length = criteria.count;

	};
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
		this.elitismFunction = ElitismFunction.forName();
		this.selectionFunction = SelectionFunction.forName( "TopPercentileSelectionFunction" );
		this.beddingFunction = BeddingFunction.forName();

		this.crossoverFunction = CrossoverFunction.forName( "KPointCrossoverFunction" );
		this.mutationFunction = MutationFunction.forName( "AggressiveMutationFunction" );

		this.breedingFunction = BreedingFunction.forName();

		this.cullingFunction = CullingFunction.forName();

		this.protoAgent = new Agent( "P" )
			.addLayer( 2, "Activator", [ 0.2, 0.5 ] )
			.addLayer( 4, "SigmoidActivator", null, 1 )
			.addLayer( 3 )
			.addLayer( 1, "SigmoidActivator", [ 0.7 ] );

		this.protoAgent.isDirty = true;

		//this.target = [ 0.7 ];

		this.agents;

	};

	iterate ( n = 100 ) {
		if ( this.protoAgent.isDirty ) {

			this.crossoverFunction.opts.count = this.crossoverCount;
			this.crossoverFunction.opts.chance = this.crossoverChance;
			this.crossoverFunction.opts.k = 2;
			this.crossoverFunction.opts.mutationFunction = this.mutationFunction;

			this.mutationFunction.opts.chance = this.mutationChance;

			this.incarnateProtoAgent();
			this.agents = new LinkedList();

			for ( let i = 0; i < this.agentCount; i++ ) {
				this.agents.add( this.protoAgent.replicate( i ) );
			}

			// reset stats...
			this.runs = 0;
		}

		this.node.progress.value = 0;
		this.node.progress.max = n;

		for ( let i = 0; i < n; i++ ) {
			Promise.resolve().then(
				() => {
					setTimeout( this.batch.bind( this ), 0 );
				}
			);
		}

	};

	batch () {
		this.node.progress.value++;

		for ( let agent of this.agents ) {
			agent.prepareRun( this.protoAgent.inputBiases );
		}

		const newGen = new LinkedList();
		const runResult = this.fitnessFunction.scorePopulation( this.agents, this.protoAgent.outputBiases );

		this.sortingFunction.sort( this.agents, {} );

		this.elitismFunction.promote( this.agents, { count : this.elites } );


		this.elitismFunction.replicate( this.agents, newGen, {} );

		this.selectionFunction.select( this.agents, { percentage : 0.75 } );

		const beds = this.beddingFunction.bedPopulation( this.agents, { count : 2 } );

		for ( let bed of beds ) {
			this.breedingFunction.breed( bed, newGen, this.crossoverFunction );
		}

		this.elitismFunction.salvate( this.agents, newGen, {} );

		this.cullingFunction.cull( this.agents, { count : 20 } );

		this.agents.addFrom( newGen );

		let MuTAt3 = 0;
		this.runs ++;
		const div = this._node.querySelector( "pre" );
		div.innerHTML = this.runs + "\n" +
			runResult.best.lastScore +
			" of " + this.agents.length +
			" in " +
			(runResult.end - runResult.start) + " ms"

		+ "\nMuTAt3 " + MuTAt3;

	}


	runGens ( n = 100 ) {
		this.incarnateProtoAgent();
		//this.agents = [];
		this.agents = new LinkedList();

		for ( let i = 0; i < this.agentCount; i++ ) {
			//this.agents.push( this.protoAgent.replicate( i ) );
			this.agents.add( this.protoAgent.replicate( i ) );
		}

		this.node.progress.value = 0;
		this.node.progress.max = n;
		let i = 0;

		this.crossoverFunction.opts.count = this.crossoverCount;
		this.crossoverFunction.opts.chance = this.crossoverChance;
		this.crossoverFunction.opts.k = 2;
		this.crossoverFunction.opts.mutationFunction = this.mutationFunction;

		this.mutationFunction.opts.chance = this.mutationChance;

		Promise.resolve().then( ()=>{
			for ( i = 0; i < n; i ++ ) {
				setTimeout( this.runGen.bind(this), 0 );
			}
		});

	};

	runGen () {
		this.node.progress.value++;

		let run = this.run();

		this.sortingFunction.sort( this.agents )

		let MuTAt3 = 0;

		const iterable = this.agents.values();
		let agentA = null;
		let agentB = null;

		for ( let agent of iterable ) {
			if ( agent.isElite || agent.lastScore <= this.breedScore ) {
				//console.warn("Elite", agent);
				continue;
			}

			if ( agentA == null ) {
				agentA = agent;
			} else if ( agentB == null ) {
				agentB = agent;

				MuTAt3 += this.copulate( agentA, agentB );

				agentA = null;
				agentB = null;
			}

		}


//		for ( let i = this.elites; i < this.agents.length; i += 2 ) {
//			if ( i + 1 < this.agents.length ) {
//				// FIXME: iterate using .next()...
//				//const agentA = this.agents[ i ];
//				const agentA = this.agents.get( i );
//				if ( agentA.lastScore <= this.breedScore ) {
//					i--;
//					continue;
//				}
//				//const agentB = this.agents[ i + 1 ];
//				const agentB = this.agents.get( i + 1 );
//				MuTAt3 += this.copulate( agentA, agentB );
//			}
//		}

		const div = this._node.querySelector( "pre" );
		div.innerHTML = this.runs + "\n" + run + "\nMuTAt3 " + MuTAt3;
	};


	run () {

		const inputBiases = this.protoAgent.inputBiases;
		for ( let agent of this.agents ) {
			agent.prepareRun( inputBiases );
		}

		const runResult = this.fitnessFunction.scorePopulation( this.agents, this.protoAgent.outputBiases );

		this.elitismFunction.promote( this.agents, {} );

		this.runs ++;

		return [ [ runResult.best.lastScore, runResult.worst.lastScore ],
			[ runResult.lowest.lastScore, runResult.highest.lastScore ],
			[ runResult.start, runResult.end, runResult.run ] ];
	};


	copulate ( agentA, agentB ) {

		let dnaA = agentA.dna;
		let dnaB = agentB.dna;

		let MuTAt3 = 0;

		for ( let i = 0; i < dnaA.length; i++ ) {
			let partA = dnaA[ i ];
			let partB = dnaB[ i ];

			MuTAt3 += this.crossoverFunction.crossover( partA, partB );

		}

		agentA.dna = dnaA;
		agentB.dna = dnaB;

		return MuTAt3;
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
		this._node = node;

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

		node.crossoverCount = node.querySelector( "#xoverPercent" );
		node.crossoverCount.value = 100 * (this.crossoverCount / 20.0 );
		node.crossoverCount.addEventListener( "change", (e)=>{ this.crossoverCount = Math.round(20.0 * (e.target.value/100.0) ); } );

		node.crossoverChance = node.querySelector( "#xoverChance" );
		node.crossoverChance.value = 100.0 * this.crossoverChance;
		node.crossoverChance.addEventListener( "change", (e)=>{ this.crossoverChance = e.target.value / 100.0; } );

		node.crossoverFunction = node.querySelector( "#xoverFunction" );
		CrossoverFunction.populateSelect( node.crossoverFunction, this.crossoverFunction.constructor.name  );
		node.crossoverFunction.addEventListener( "change", (e)=>{ this.crossoverFunction = CrossoverFunction.forName( e.target.value);});

//		node.crossoverBias = node.querySelector( "#xoverBias" );
//		node.crossoverBias.disabled = true;

		node.mutationChance = node.querySelector( "#mutationChance" );
		node.mutationChance.value = 100.0 * this.mutationChance;
		node.mutationChance.addEventListener( "change", (e)=>{ this.mutationChance = e.target.value / 100.0; } );

		node.mutationFunction = node.querySelector( "#mutationFunction" );
		node.mutationFunction.disabled = true;

//		node.mutateBias = node.querySelector( "#mutateBias" );
//		node.mutateBias.disabled = true;

		node.reset = node.querySelector ( "#reset" );
		node.reset.addEventListener( "click", (e)=>{this.dirtyProto();});

		node.run = node.querySelector( "#run" );
		node.run.disabled = true;

		node.step1 = node.querySelector( "#step1" );
		node.step1.addEventListener( "click", (e)=>{
			//Promise.resolve().then( (e)=>{this.runGens( 1 ); });
			Promise.resolve().then( (e)=>{this.iterate( 1 ); });
		});

		node.step100 = node.querySelector( "#step100" );
		node.step100.addEventListener( "click", (e)=>{
			//Promise.resolve().then( (e)=>{this.runGens( 100 ); });
			Promise.resolve().then( (e)=>{this.iterate( 100 ); });
		});

		node.step1000 = node.querySelector( "#step1000" );
		node.step1000.addEventListener( "click", (e)=>{
			//Promise.resolve().then( (e)=>{this.runGens( 1000 ); });
			Promise.resolve().then( (e)=>{this.iterate( 1000 ); });
		});

		node.progress = node.querySelector( "progress" );

		node.protoDiv = node.querySelector( "#protodiv" );
		this.updateProtoDiv( node.protoDiv );

		return this._node;
	};

	dirtyProto () {
		this.protoAgent.isDirty = true;
	};

	updateProtoDiv ( div ) {
		const ac = div.querySelector( "#agentcountdiv" );
		this._node.agentCount = div.querySelector( "#agentCount" );
		this._node.agentCount.value = this.agentCount;
		this._node.agentCount.addEventListener( "change", (e)=>{ this.agentCount = parseInt( e.target.value ); } );

		div.innerHTML = "";

		div.appendChild( ac );

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

		for ( let el of div.querySelectorAll( "input" ) ) {
			el.addEventListener( "change", (e)=>{this.dirtyProto();});
		}

		for ( let el of div.querySelectorAll( "select" ) ) {
			el.addEventListener( "change", (e)=>{this.dirtyProto();});
		}

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


class LinkedListNode extends Object {
	constructor ( value, next ) {
		super();
		this.value = value;
		this.next = next;
	};
}


class LinkedList extends Object {
	constructor ( ...values ) {
		super();
		this.head = null;
		this.tail = null;
		this.length = 0;

		Object.defineProperty( this, "back", { value : [] } );

		if ( values != null ) {
			this.addAll( ...values );
		}
	};

	/**
	 * "Clears" the backing array in a kind'a expensive way.
	 */
	shrink () {
		while ( this.back.length > 0 ) {
			this.back.pop();
		}
	};

	add ( value ) {

		const node = new LinkedListNode( value );

		if ( this.head == null ) {
			this.head = node;
			this.tail = node;
		} else {
			this.tail.next = node;
			this.tail = node;
		}

		this.length++;
		return this;
	};

	addAll ( ...values ) {

		for ( let value of values ) {
			this.add( value );
		}

		return this;
	};

	addFrom ( iterable ) {
		for ( let value of iterable ) {
			this.add( value );
		}

		return this;
	}

	insert ( value, index = 0 ) {

		if ( ( index > 0 ) && ( index < this.length ) ) {

			const newNode = new LinkedListNode( value );
			const node = this.getNode(  index - 1 );

			newNode.next = node.next;
			node.next = newNode;

			if ( newNode.next == null ) {
				this.tail = newNode;
			}

			this.length++;
			return this;
		} if ( index == 0 ) {

			const newNode = new LinkedListNode ( value );

			newNode.next = this.head;

			this.head = newNode;

			if ( newNode.next == null ) {
				this.tail = newNode;
			}

			this.length++;
			return this;
		} else {
			throw new RangeError( "Invalid index range: " + index );
		}
	};

	getNode ( index = 0 ) {
		if ( ( index > -1 ) && ( index < this.length ) ) {

			let current = this.head;
			let i = 0;

			while ( ( current != null ) && ( i < index ) ) {
				current = current.next;
				i++;
			}

			return current;
		} else {
			throw new RangeError( "Invalid index range: " + index );
		}
	};

	get ( index ) {

		if ( index && index < 0 ) {
			index += this.length;
		}

		return this.getNode( index ).value;
	};

	set ( value, index ) {

		const node = this.getNode( index );
		const ret = node.value;

		node.value = value;

		return ret;
	};

	remove ( index ) {
		if ( ( this.head != null ) && ( index > -1 ) && ( index < this.length ) ) {
			if ( index == 0 ) {
				const node = this.head;
				this.head = this.head.next;

				if ( this.head == null ) {
					this.tail = null;
				}

				this.length--;
				return node.value;
			} else {
				let current = this.head;
				let previous = null;
				let i = 0;

				while ( ( current != null ) && ( i < index ) ) {
					previous = current;
					current = current.next;
					i++;
				}

				if ( current != null ) {
					previous.next = current.next;

					if ( previous.next == null ) {
						this.tail = previous;
					}

					this.length--;
					return current.value;
				}
			}
		} else {
			throw new RangeError( "Invalid index range: " + index );
		}
	};

	pop () {
		return this.remove( this.length - 1 );
	};

	removeValue ( value ) {

		const index = this.indexOf( value );

		if ( index > -1 ) {
			return this.remove( index );
		}
	};

	indexOf ( value ) {
		let i = 0;

		let current = this.head;

		while ( current != null ) {
			if ( current.value == value ) {
				return i;
			}

			current = current.next;
			i++;
		}

		return -1;
	};

	contains ( value ) {
		return this.indexOf( value ) > -1;
	};

	* values () {
		let current = this.head;
		while ( current != null ) {
			yield current.value;
			current = current.next;
		}
	};

	[Symbol.iterator] () {
		return this.values();
	};

	toArray ( dest, offset, count ) {

		if ( offset == null ) {
			offset = 0;
		} else if ( offset < 0 || offset > this.length ) {
			throw new RangeError( "Invalid offset: " + offset );
		}

		if ( count == null ) {
			count = dest == null ? this.length : dest.length;
		} else if ( count < 0 || offset + count > this.length ) {
			throw new RangeError( "Invalid count: " + count );
		}

		if ( dest == this.back && dest.length < count ) {
			dest.concat( new Array( count - dest.length ) );
		} else if ( dest == null ) {
			dest = new Array( count );
		} else if ( dest.length < count ) {
			throw new RangeError ("Destination array is too small: " + this.length + " > " + dest.length );
		}

		let index = 0;
		const end = offset + count;

		for ( let value of this.values() ) {

			if ( index >= offset && index < end ) {
				dest[ index - offset ] = value;
			}

			index++;

			if ( index >= end ) {
				break;
			}
		}

		return dest;
	};

	sort ( compareFunction ) {

		const sorted = this.toArray( this.back, 0, this.length ).sort( compareFunction );

		for ( let i = 0; i < this.length; i++ ) {
			this.set( sorted[ i ], i );
		}

		return this;
	};

	toString ( full ) {

		let s = full == true ? "(" + this.length + ") " : "";

		let current = this.head;

		while ( current != null ) {
			s += ( current != this.head ? "," : "" ) + current.value;
			current = current.next;
		}

		if ( full == true ) {
			s += " [" + ( this.tail != null ? this.tail.value : "" ) + "]";
		}

		return s;
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
