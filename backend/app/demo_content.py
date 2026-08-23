SAMPLE_FILENAME = "How Neural Networks Learn.txt"

SAMPLE_TEXT = """How Neural Networks Learn

Neurons and Weights

A neural network is built from layers of simple units called neurons. Each neuron receives one or more numeric inputs, multiplies every input by a "weight" (a number representing how important that input is), adds a "bias" term, and sums the result. Weights start out as small random numbers. Learning, in a neural network, really just means gradually adjusting these weights and biases so the network's outputs get closer to the correct answers. A network with more neurons and layers can represent more complex patterns, but it also needs more data and more adjustment to learn well.

Activation Functions

After a neuron sums its weighted inputs, that sum is passed through an activation function before being sent to the next layer. Without an activation function, stacking layers would be mathematically equivalent to a single layer, no matter how many layers you added — the network would only ever be able to learn straight-line relationships. Activation functions introduce non-linearity, which is what allows a network to model curved, complex relationships between inputs and outputs. Common activation functions include ReLU (which outputs zero for any negative input and passes positive inputs through unchanged) and sigmoid (which squashes any input into a value between 0 and 1, often used when the output should represent a probability).

The Forward Pass

Making a prediction with a neural network is called a "forward pass." Input data enters the first layer, gets transformed by each neuron's weights, bias, and activation function, and the result is passed forward as the input to the next layer. This repeats layer by layer until the final layer produces the network's output — for example, a predicted category or a predicted number. During training, a forward pass is run on example data whose correct answer is already known, so the network's prediction can be compared against that known answer.

The Loss Function

Once the network produces a prediction, a loss function measures exactly how wrong that prediction was compared to the true answer. A small loss means the prediction was close to correct; a large loss means it was far off. Different tasks use different loss functions — for example, mean squared error is common when predicting a continuous number, while cross-entropy loss is common when predicting a category. The entire goal of training a neural network is to adjust its weights so that, over many examples, the loss function's value gets smaller and smaller.

Backpropagation

Backpropagation is the algorithm that figures out how much each individual weight in the network contributed to the final loss. It works backward from the output layer to the input layer, using calculus (the chain rule) to calculate the "gradient" for every weight — a number that says both which direction to change that weight in, and how much that change would affect the loss. Backpropagation doesn't change any weights by itself; it only calculates how each weight should change. A network with many layers requires backpropagation to pass this information all the way back through every layer without it vanishing or exploding, which is one of the classic challenges of training deep networks.

Gradient Descent

Gradient descent is the algorithm that actually updates the weights, using the gradients that backpropagation calculated. Each weight is nudged slightly in the direction that reduces the loss, and the size of that nudge is controlled by a setting called the "learning rate." If the learning rate is too large, training can overshoot the best weights and become unstable; if it's too small, training can take an extremely long time to improve. This cycle — forward pass, measure loss, backpropagate the gradients, update the weights with gradient descent — is repeated over and over, often for thousands or millions of examples, until the network's predictions become reliably accurate.
"""
