use anyhow::{Result, anyhow};
use fastrand;
use ndarray::{Array2, Array1};
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

/// Activation functions for neural networks
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum ActivationFunction {
    Linear,
    Sigmoid,
    Tanh,
    ReLU,
    LeakyReLU,
    GELU,
}

impl ActivationFunction {
    /// Apply the activation function to a value
    pub fn apply(&self, x: f32) -> f32 {
        match self {
            ActivationFunction::Linear => x,
            ActivationFunction::Sigmoid => 1.0 / (1.0 + (-x).exp()),
            ActivationFunction::Tanh => x.tanh(),
            ActivationFunction::ReLU => x.max(0.0),
            ActivationFunction::LeakyReLU => {
                if x > 0.0 { x } else { 0.01 * x }
            },
            ActivationFunction::GELU => {
                0.5 * x * (1.0 + (2.0 / std::f32::consts::PI).sqrt() * (x + 0.044715 * x.powi(3))).tanh()
            }
        }
    }

    /// Apply the derivative of the activation function
    pub fn derivative(&self, x: f32) -> f32 {
        match self {
            ActivationFunction::Linear => 1.0,
            ActivationFunction::Sigmoid => {
                let s = self.apply(x);
                s * (1.0 - s)
            },
            ActivationFunction::Tanh => 1.0 - x.tanh().powi(2),
            ActivationFunction::ReLU => if x > 0.0 { 1.0 } else { 0.0 },
            ActivationFunction::LeakyReLU => if x > 0.0 { 1.0 } else { 0.01 },
            ActivationFunction::GELU => {
                // Approximate derivative of GELU
                let cdf = 0.5 * (1.0 + (2.0 / std::f32::consts::PI).sqrt() * (x + 0.044715 * x.powi(3))).tanh();
                let pdf = (2.0 / std::f32::consts::PI).sqrt() * (-0.5 * x.powi(2)).exp();
                cdf + x * pdf
            }
        }
    }
}

/// Neural network layer configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayerConfig {
    pub size: usize,
    pub activation: ActivationFunction,
    pub dropout_rate: f32,
}

/// FANN-inspired Neural Network Builder
#[derive(Debug)]
pub struct NetworkBuilder {
    layers: Vec<LayerConfig>,
    learning_rate: f32,
    connection_rate: f32, // For sparse networks
}

impl NetworkBuilder {
    pub fn new() -> Self {
        Self {
            layers: Vec::new(),
            learning_rate: 0.001,
            connection_rate: 1.0,
        }
    }

    /// Add input layer
    pub fn input_layer(mut self, size: usize) -> Self {
        self.layers.push(LayerConfig {
            size,
            activation: ActivationFunction::Linear,
            dropout_rate: 0.0,
        });
        self
    }

    /// Add hidden layer with activation function
    pub fn hidden_layer_with_activation(
        mut self, 
        size: usize, 
        activation: ActivationFunction, 
        dropout_rate: f32
    ) -> Self {
        self.layers.push(LayerConfig {
            size,
            activation,
            dropout_rate,
        });
        self
    }

    /// Add hidden layer with default sigmoid activation
    pub fn hidden_layer(self, size: usize) -> Self {
        self.hidden_layer_with_activation(size, ActivationFunction::Sigmoid, 0.0)
    }

    /// Add output layer
    pub fn output_layer(mut self, size: usize) -> Self {
        self.layers.push(LayerConfig {
            size,
            activation: ActivationFunction::Linear,
            dropout_rate: 0.0,
        });
        self
    }

    /// Add output layer with specific activation
    pub fn output_layer_with_activation(mut self, size: usize, activation: ActivationFunction) -> Self {
        self.layers.push(LayerConfig {
            size,
            activation,
            dropout_rate: 0.0,
        });
        self
    }

    /// Set learning rate
    pub fn learning_rate(mut self, rate: f32) -> Self {
        self.learning_rate = rate;
        self
    }

    /// Set connection rate for sparse networks
    pub fn connection_rate(mut self, rate: f32) -> Self {
        self.connection_rate = rate.clamp(0.0, 1.0);
        self
    }

    /// Build the neural network
    pub fn build(self) -> Result<NeuralNetwork> {
        if self.layers.len() < 2 {
            return Err(anyhow!("Network must have at least input and output layers"));
        }

        let mut weights = Vec::new();
        let mut biases = Vec::new();

        // Initialize weights and biases for each layer connection
        for i in 0..self.layers.len() - 1 {
            let input_size = self.layers[i].size;
            let output_size = self.layers[i + 1].size;

            // Xavier/Glorot initialization
            let scale = (2.0 / (input_size + output_size) as f32).sqrt();
            
            let mut layer_weights = Array2::zeros((output_size, input_size));
            for i in 0..output_size {
                for j in 0..input_size {
                    if self.connection_rate >= 1.0 || fastrand::f32() < self.connection_rate {
                        layer_weights[[i, j]] = (fastrand::f32() - 0.5) * 2.0 * scale;
                    }
                }
            }

            let layer_biases = Array1::zeros(output_size);

            weights.push(layer_weights);
            biases.push(layer_biases);
        }

        Ok(NeuralNetwork {
            layers: self.layers,
            weights,
            biases,
            learning_rate: self.learning_rate,
        })
    }
}

/// FANN-inspired Neural Network
#[derive(Debug)]
pub struct NeuralNetwork {
    layers: Vec<LayerConfig>,
    weights: Vec<Array2<f32>>,
    biases: Vec<Array1<f32>>,
    learning_rate: f32,
}

impl NeuralNetwork {
    /// Create a simple feedforward network with given layer sizes
    pub fn new(layer_sizes: &[usize]) -> Result<Self> {
        let mut builder = NetworkBuilder::new();
        
        if layer_sizes.is_empty() {
            return Err(anyhow!("Must provide at least one layer size"));
        }

        builder = builder.input_layer(layer_sizes[0]);
        
        for &size in &layer_sizes[1..layer_sizes.len()-1] {
            builder = builder.hidden_layer(size);
        }
        
        if layer_sizes.len() > 1 {
            builder = builder.output_layer(layer_sizes[layer_sizes.len()-1]);
        }

        builder.build()
    }

    /// Run forward pass through the network
    pub fn run(&self, input: &[f32]) -> Vec<f32> {
        if input.len() != self.layers[0].size {
            return vec![0.0; self.layers.last().unwrap().size];
        }

        let mut activations = Array1::from_vec(input.to_vec());

        // Forward pass through each layer
        for i in 0..self.weights.len() {
            // Linear transformation: output = weights * input + bias
            let linear_output = self.weights[i].dot(&activations) + &self.biases[i];
            
            // Apply activation function
            let layer_config = &self.layers[i + 1];
            activations = linear_output.mapv(|x| layer_config.activation.apply(x));
        }

        activations.to_vec()
    }

    /// Get network statistics 
    pub fn num_layers(&self) -> usize {
        self.layers.len()
    }

    pub fn num_inputs(&self) -> usize {
        self.layers[0].size
    }

    pub fn num_outputs(&self) -> usize {
        self.layers.last().unwrap().size
    }

    pub fn total_neurons(&self) -> usize {
        self.layers.iter().map(|l| l.size).sum()
    }

    pub fn total_connections(&self) -> usize {
        self.weights.iter().map(|w| w.len()).sum()
    }

    /// Get all weights as a flat vector
    pub fn get_weights(&self) -> Vec<f32> {
        let mut all_weights = Vec::new();
        for weight_matrix in &self.weights {
            all_weights.extend(weight_matrix.iter().copied());
        }
        for bias_vector in &self.biases {
            all_weights.extend(bias_vector.iter().copied());
        }
        all_weights
    }

    /// Set weights from a flat vector
    pub fn set_weights(&mut self, weights: &[f32]) -> Result<()> {
        let mut idx = 0;
        
        // Set weight matrices
        for weight_matrix in &mut self.weights {
            let matrix_size = weight_matrix.len();
            if idx + matrix_size > weights.len() {
                return Err(anyhow!("Not enough weights provided"));
            }
            
            for i in 0..weight_matrix.nrows() {
                for j in 0..weight_matrix.ncols() {
                    weight_matrix[[i, j]] = weights[idx];
                    idx += 1;
                }
            }
        }

        // Set bias vectors
        for bias_vector in &mut self.biases {
            let vector_size = bias_vector.len();
            if idx + vector_size > weights.len() {
                return Err(anyhow!("Not enough weights provided for biases"));
            }
            
            for i in 0..vector_size {
                bias_vector[i] = weights[idx];
                idx += 1;
            }
        }

        if idx != weights.len() {
            return Err(anyhow!("Weight vector size mismatch"));
        }

        Ok(())
    }

    /// Train the network on a single example using backpropagation
    pub fn train_incremental(&mut self, input: &[f32], target: &[f32]) -> Result<f32> {
        if input.len() != self.num_inputs() || target.len() != self.num_outputs() {
            return Err(anyhow!("Input or target size mismatch"));
        }

        // Forward pass with activation storage
        let mut activations = vec![Array1::from_vec(input.to_vec())];
        let mut linear_outputs = Vec::new();

        for i in 0..self.weights.len() {
            let linear = self.weights[i].dot(&activations[i]) + &self.biases[i];
            linear_outputs.push(linear.clone());
            
            let activated = linear.mapv(|x| self.layers[i + 1].activation.apply(x));
            activations.push(activated);
        }

        // Calculate output error
        let target_array = Array1::from_vec(target.to_vec());
        let output = &activations[activations.len() - 1];
        let error = &target_array - output;
        let mse = error.iter().map(|&e| e * e).sum::<f32>() / error.len() as f32;

        // Backward pass
        let mut deltas = vec![Array1::zeros(0); self.layers.len()];
        
        // Output layer delta
        let output_layer_idx = self.layers.len() - 1;
        let output_derivatives = linear_outputs[linear_outputs.len() - 1]
            .mapv(|x| self.layers[output_layer_idx].activation.derivative(x));
        deltas[output_layer_idx] = &error * &output_derivatives;

        // Hidden layer deltas (backpropagation)
        for i in (1..self.layers.len() - 1).rev() {
            let layer_derivatives = linear_outputs[i - 1]
                .mapv(|x| self.layers[i].activation.derivative(x));
            
            // Compute error from next layer
            let next_error = self.weights[i].t().dot(&deltas[i + 1]);
            deltas[i] = &next_error * &layer_derivatives;
        }

        // Update weights and biases
        for i in 0..self.weights.len() {
            let layer_idx = i + 1;
            
            // Update weights: W = W + learning_rate * delta * activation_input^T
            let weight_update = deltas[layer_idx].clone()
                .insert_axis(ndarray::Axis(1))
                .dot(&activations[i].clone().insert_axis(ndarray::Axis(0)));
            
            self.weights[i] = &self.weights[i] + &(weight_update * self.learning_rate);
            
            // Update biases: b = b + learning_rate * delta
            self.biases[i] = &self.biases[i] + &(deltas[layer_idx].clone() * self.learning_rate);
        }

        Ok(mse)
    }

    /// Train on multiple examples
    pub fn train(&mut self, inputs: &[Vec<f32>], targets: &[Vec<f32>], epochs: usize) -> Result<Vec<f32>> {
        if inputs.len() != targets.len() {
            return Err(anyhow!("Number of inputs and targets must match"));
        }

        let mut errors = Vec::new();

        for epoch in 0..epochs {
            let mut epoch_error = 0.0;
            
            // Shuffle training data
            let mut indices: Vec<usize> = (0..inputs.len()).collect();
            fastrand::shuffle(&mut indices);

            for &idx in &indices {
                let error = self.train_incremental(&inputs[idx], &targets[idx])?;
                epoch_error += error;
            }

            epoch_error /= inputs.len() as f32;
            errors.push(epoch_error);

            // Early stopping if error is very small
            if epoch_error < 1e-6 {
                break;
            }
        }

        Ok(errors)
    }

    /// Calculate Mean Squared Error on a dataset
    pub fn calculate_mse(&self, inputs: &[Vec<f32>], targets: &[Vec<f32>]) -> f32 {
        if inputs.len() != targets.len() {
            return f32::INFINITY;
        }

        let mut total_error = 0.0;

        for (input, target) in inputs.iter().zip(targets.iter()) {
            let output = self.run(input);
            let error: f32 = output.iter()
                .zip(target.iter())
                .map(|(o, t)| (o - t).powi(2))
                .sum();
            total_error += error / target.len() as f32;
        }

        total_error / inputs.len() as f32
    }
}

/// Training data structure
#[derive(Debug, Clone)]
pub struct TrainingData {
    pub inputs: Vec<Vec<f32>>,
    pub outputs: Vec<Vec<f32>>,
}

impl TrainingData {
    pub fn new() -> Self {
        Self {
            inputs: Vec::new(),
            outputs: Vec::new(),
        }
    }

    pub fn add_example(&mut self, input: Vec<f32>, output: Vec<f32>) {
        self.inputs.push(input);
        self.outputs.push(output);
    }

    pub fn len(&self) -> usize {
        self.inputs.len()
    }

    pub fn is_empty(&self) -> bool {
        self.inputs.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_activation_functions() {
        assert_eq!(ActivationFunction::Linear.apply(2.0), 2.0);
        assert!(ActivationFunction::Sigmoid.apply(0.0) > 0.4 && ActivationFunction::Sigmoid.apply(0.0) < 0.6);
        assert_eq!(ActivationFunction::ReLU.apply(-1.0), 0.0);
        assert_eq!(ActivationFunction::ReLU.apply(1.0), 1.0);
    }

    #[test]
    fn test_network_creation() {
        let network = NetworkBuilder::new()
            .input_layer(2)
            .hidden_layer(4)
            .output_layer(1)
            .build()
            .unwrap();

        assert_eq!(network.num_inputs(), 2);
        assert_eq!(network.num_outputs(), 1);
        assert_eq!(network.num_layers(), 3);
    }

    #[test]
    fn test_forward_pass() {
        let mut network = NetworkBuilder::new()
            .input_layer(2)
            .hidden_layer(3)
            .output_layer(1)
            .build()
            .unwrap();

        let input = vec![0.5, 0.7];
        let output = network.run(&input);
        
        assert_eq!(output.len(), 1);
    }

    #[test]
    fn test_xor_training() {
        let mut network = NetworkBuilder::new()
            .input_layer(2)
            .hidden_layer_with_activation(4, ActivationFunction::Sigmoid, 0.0)
            .output_layer_with_activation(1, ActivationFunction::Sigmoid)
            .learning_rate(0.5)
            .build()
            .unwrap();

        let inputs = vec![
            vec![0.0, 0.0], vec![0.0, 1.0],
            vec![1.0, 0.0], vec![1.0, 1.0],
        ];
        let targets = vec![
            vec![0.0], vec![1.0],
            vec![1.0], vec![0.0],
        ];

        let errors = network.train(&inputs, &targets, 1000).unwrap();
        
        // Should converge to low error
        assert!(errors.last().unwrap() < &0.1);

        // Test XOR functionality
        let test_00 = network.run(&vec![0.0, 0.0])[0];
        let test_11 = network.run(&vec![1.0, 1.0])[0];
        let test_01 = network.run(&vec![0.0, 1.0])[0];
        let test_10 = network.run(&vec![1.0, 0.0])[0];

        assert!(test_00 < 0.3); // Should be close to 0
        assert!(test_11 < 0.3); // Should be close to 0
        assert!(test_01 > 0.7); // Should be close to 1
        assert!(test_10 > 0.7); // Should be close to 1
    }
}