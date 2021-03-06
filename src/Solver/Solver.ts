import rawData from '@data/data.json';
import {default as solver, ISolverModel, ISolverResult, ISolverResultSingle} from 'javascript-lp-solver';
import {IRecipeSchema} from '@src/Schema/IRecipeSchema';
import {IJsonSchema} from '@src/Schema/IJsonSchema';
import {IProductionToolRequest} from '@src/Tools/Production/IProductionToolRequest';

export class Solver
{

	public static solveProduction(productionRequest: IProductionToolRequest): ISolverResult|ISolverResultSingle
	{
		const data: IJsonSchema = rawData;
		const model: ISolverModel = {
			optimize: {},
			constraints: {},
			variables: {},
		};

		const rawResources: {[key: string]: number} = {};

		for (const k in data.items) {
			if (data.items.hasOwnProperty(k)) {
				const item = data.items[k];
				if (!(item.className in data.resources)) {
					model.constraints[item.className] = {
						min: 0,
					};
				} else {
					if (productionRequest.blockedResources.indexOf(item.className) !== -1) {
						model.constraints[item.className] = {
							equal: 0,
						};
					} else {
						model.constraints[item.className] = {
							max: 0,
							min: -productionRequest.resourceMax[item.className],
						};
						rawResources[item.className] = productionRequest.resourceWeight[item.className];
					}
				}
			}
		}

		// TODO optimize for whatever is needed
		model.variables.rawResources = rawResources;
		model.optimize.rawResources = 'max';

		for (const itemAmount of productionRequest.production) {
			//delete model.optimize[itemAmount.item.prototype.className];
			model.constraints[itemAmount.item.prototype.className] = {
				equal: parseFloat(itemAmount.amount + ''),
			};
		}

		for (const k in data.recipes) {
			if (data.recipes.hasOwnProperty(k)) {
				const recipe: IRecipeSchema = data.recipes[k];
				if (!recipe.inMachine) {
					continue;
				}

				if (recipe.alternate && productionRequest.allowedAlternateRecipes.indexOf(recipe.className) === -1) {
					continue;
				}

				if (!recipe.alternate && productionRequest.blockedRecipes.indexOf(recipe.className) !== -1) {
					continue;
				}

				const def: {[key: string]: number} = {};
				for (const ingredient of recipe.ingredients) {
					if (!(ingredient.item in def)) {
						def[ingredient.item] = 0;
					}
					def[ingredient.item] += -ingredient.amount;
				}
				for (const product of recipe.products) {
					if (!(product.item in def)) {
						def[product.item] = 0;
					}
					def[product.item] += product.amount;
				}
				model.variables[recipe.className] = def;
			}
		}

		return solver.Solve(model);
	}

}
