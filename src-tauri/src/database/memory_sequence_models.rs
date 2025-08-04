use anyhow::{Result, anyhow};
use std::collections::HashMap;
use super::neural_network::{NeuralNetwork, NetworkBuilder, ActivationFunction};
use super::memory::{AgentMemory, MemoryType};
use serde::{Serialize, Deserialize};
use ndarray::{Array1, Array2};

/// LSTM cell implementation for memory sequence modeling
#[derive(Debug, Clone)]
pub struct LSTMCell {
    /// Input dimension
    input_size: usize,
    /// Hidden state dimension
    hidden_size: usize,
    /// Forget gate weights (input, hidden, bias)
    forget_gate: (Array2<f32>, Array2<f32>, Array1<f32>),
    /// Input gate weights (input, hidden, bias)
    input_gate: (Array2<f32>, Array2<f32>, Array1<f32>),
    /// Candidate gate weights (input, hidden, bias)
    candidate_gate: (Array2<f32>, Array2<f32>, Array1<f32>),
    /// Output gate weights (input, hidden, bias)
    output_gate: (Array2<f32>, Array2<f32>, Array1<f32>),
}

impl LSTMCell {
    /// Create a new LSTM cell
    pub fn new(input_size: usize, hidden_size: usize) -> Self {
        let init_scale = (2.0 / (input_size + hidden_size) as f32).sqrt();
        
        Self {
            input_size,
            hidden_size,
            forget_gate: Self::init_gate_weights(input_size, hidden_size, init_scale),
            input_gate: Self::init_gate_weights(input_size, hidden_size, init_scale),
            candidate_gate: Self::init_gate_weights(input_size, hidden_size, init_scale),
            output_gate: Self::init_gate_weights(input_size, hidden_size, init_scale),
        }
    }

    /// Initialize gate weights with Xavier initialization
    fn init_gate_weights(input_size: usize, hidden_size: usize, scale: f32) -> (Array2<f32>, Array2<f32>, Array1<f32>) {
        let w_input = Array2::from_shape_fn((hidden_size, input_size), |_| (fastrand::f32() - 0.5) * 2.0 * scale);
        let w_hidden = Array2::from_shape_fn((hidden_size, hidden_size), |_| (fastrand::f32() - 0.5) * 2.0 * scale);
        let bias = Array1::zeros(hidden_size);
        (w_input, w_hidden, bias)
    }

    /// Forward pass through LSTM cell
    pub fn forward(
        &self,
        input: &Array1<f32>,
        hidden_state: &Array1<f32>,
        cell_state: &Array1<f32>,
    ) -> (Array1<f32>, Array1<f32>) {
        // Forget gate: f_t = sigmoid(W_f * [h_{t-1}, x_t] + b_f)
        let forget_gate_input = self.forget_gate.0.dot(input) + self.forget_gate.1.dot(hidden_state) + &self.forget_gate.2;
        let forget_gate_output = forget_gate_input.mapv(|x| ActivationFunction::Sigmoid.apply(x));

        // Input gate: i_t = sigmoid(W_i * [h_{t-1}, x_t] + b_i)
        let input_gate_input = self.input_gate.0.dot(input) + self.input_gate.1.dot(hidden_state) + &self.input_gate.2;
        let input_gate_output = input_gate_input.mapv(|x| ActivationFunction::Sigmoid.apply(x));

        // Candidate values: C̃_t = tanh(W_C * [h_{t-1}, x_t] + b_C)
        let candidate_input = self.candidate_gate.0.dot(input) + self.candidate_gate.1.dot(hidden_state) + &self.candidate_gate.2;
        let candidate_output = candidate_input.mapv(|x| ActivationFunction::Tanh.apply(x));

        // Cell state: C_t = f_t * C_{t-1} + i_t * C̃_t
        let new_cell_state = &forget_gate_output * cell_state + &input_gate_output * &candidate_output;

        // Output gate: o_t = sigmoid(W_o * [h_{t-1}, x_t] + b_o)
        let output_gate_input = self.output_gate.0.dot(input) + self.output_gate.1.dot(hidden_state) + &self.output_gate.2;
        let output_gate_output = output_gate_input.mapv(|x| ActivationFunction::Sigmoid.apply(x));

        // Hidden state: h_t = o_t * tanh(C_t)
        let new_hidden_state = &output_gate_output * &new_cell_state.mapv(|x| ActivationFunction::Tanh.apply(x));

        (new_hidden_state, new_cell_state)
    }
}

/// GRU cell implementation for memory sequence modeling
#[derive(Debug, Clone)]
pub struct GRUCell {
    /// Input dimension
    input_size: usize,
    /// Hidden state dimension
    hidden_size: usize,
    /// Reset gate weights (input, hidden, bias)
    reset_gate: (Array2<f32>, Array2<f32>, Array1<f32>),
    /// Update gate weights (input, hidden, bias)
    update_gate: (Array2<f32>, Array2<f32>, Array1<f32>),
    /// New gate weights (input, hidden, bias)
    new_gate: (Array2<f32>, Array2<f32>, Array1<f32>),
}

impl GRUCell {
    /// Create a new GRU cell
    pub fn new(input_size: usize, hidden_size: usize) -> Self {
        let init_scale = (2.0 / (input_size + hidden_size) as f32).sqrt();
        
        Self {
            input_size,
            hidden_size,
            reset_gate: Self::init_gate_weights(input_size, hidden_size, init_scale),
            update_gate: Self::init_gate_weights(input_size, hidden_size, init_scale),
            new_gate: Self::init_gate_weights(input_size, hidden_size, init_scale),
        }
    }

    /// Initialize gate weights with Xavier initialization
    fn init_gate_weights(input_size: usize, hidden_size: usize, scale: f32) -> (Array2<f32>, Array2<f32>, Array1<f32>) {
        let w_input = Array2::from_shape_fn((hidden_size, input_size), |_| (fastrand::f32() - 0.5) * 2.0 * scale);
        let w_hidden = Array2::from_shape_fn((hidden_size, hidden_size), |_| (fastrand::f32() - 0.5) * 2.0 * scale);
        let bias = Array1::zeros(hidden_size);
        (w_input, w_hidden, bias)
    }

    /// Forward pass through GRU cell
    pub fn forward(
        &self,
        input: &Array1<f32>,
        hidden_state: &Array1<f32>,
    ) -> Array1<f32> {
        // Reset gate: r_t = sigmoid(W_r * [h_{t-1}, x_t] + b_r)
        let reset_gate_input = self.reset_gate.0.dot(input) + self.reset_gate.1.dot(hidden_state) + &self.reset_gate.2;
        let reset_gate_output = reset_gate_input.mapv(|x| ActivationFunction::Sigmoid.apply(x));

        // Update gate: z_t = sigmoid(W_z * [h_{t-1}, x_t] + b_z)
        let update_gate_input = self.update_gate.0.dot(input) + self.update_gate.1.dot(hidden_state) + &self.update_gate.2;
        let update_gate_output = update_gate_input.mapv(|x| ActivationFunction::Sigmoid.apply(x));

        // New candidate: ñ_t = tanh(W_n * [r_t * h_{t-1}, x_t] + b_n)
        let reset_hidden = &reset_gate_output * hidden_state;
        let new_gate_input = self.new_gate.0.dot(input) + self.new_gate.1.dot(&reset_hidden) + &self.new_gate.2;
        let new_gate_output = new_gate_input.mapv(|x| ActivationFunction::Tanh.apply(x));

        // Hidden state: h_t = (1 - z_t) * h_{t-1} + z_t * ñ_t
        let one_minus_update = update_gate_output.mapv(|x| 1.0 - x);
        &one_minus_update * hidden_state + &update_gate_output * &new_gate_output
    }
}

/// Memory sequence model that uses LSTM/GRU for temporal understanding
#[derive(Debug)]
pub struct MemorySequenceModel {
    /// Type of sequence model (LSTM or GRU)
    model_type: SequenceModelType,
    /// LSTM cells (if using LSTM)
    lstm_cells: Option<Vec<LSTMCell>>,
    /// GRU cells (if using GRU)
    gru_cells: Option<Vec<GRUCell>>,
    /// Input embedding size
    input_size: usize,
    /// Hidden state size
    hidden_size: usize,
    /// Number of layers
    num_layers: usize,
    /// Output projection network
    output_network: NeuralNetwork,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SequenceModelType {
    LSTM,
    GRU,
}

impl MemorySequenceModel {
    /// Create a new memory sequence model
    pub fn new(
        model_type: SequenceModelType,
        input_size: usize,
        hidden_size: usize,
        output_size: usize,
        num_layers: usize,
    ) -> Result<Self> {
        let (lstm_cells, gru_cells) = match model_type {
            SequenceModelType::LSTM => {
                let mut cells = Vec::new();
                for i in 0..num_layers {
                    let layer_input_size = if i == 0 { input_size } else { hidden_size };
                    cells.push(LSTMCell::new(layer_input_size, hidden_size));
                }
                (Some(cells), None)
            }
            SequenceModelType::GRU => {
                let mut cells = Vec::new();
                for i in 0..num_layers {
                    let layer_input_size = if i == 0 { input_size } else { hidden_size };
                    cells.push(GRUCell::new(layer_input_size, hidden_size));
                }
                (None, Some(cells))
            }
        };

        // Create output projection network
        let output_network = NetworkBuilder::new()
            .input_layer(hidden_size)
            .hidden_layer_with_activation(hidden_size / 2, ActivationFunction::ReLU, 0.1)
            .output_layer(output_size)
            .learning_rate(0.001)
            .build()?;

        Ok(Self {
            model_type,
            lstm_cells,
            gru_cells,
            input_size,
            hidden_size,
            num_layers,
            output_network,
        })
    }

    /// Process a sequence of memory embeddings
    pub fn process_sequence(&self, sequence: &[Vec<f32>]) -> Result<Vec<f32>> {
        if sequence.is_empty() {
            return Ok(vec![0.0; self.hidden_size]);
        }

        match self.model_type {
            SequenceModelType::LSTM => self.process_lstm_sequence(sequence),
            SequenceModelType::GRU => self.process_gru_sequence(sequence),
        }
    }

    /// Process sequence through LSTM layers
    fn process_lstm_sequence(&self, sequence: &[Vec<f32>]) -> Result<Vec<f32>> {
        let lstm_cells = self.lstm_cells.as_ref().ok_or_else(|| anyhow!("LSTM cells not initialized"))?;
        
        // Initialize hidden and cell states for all layers
        let mut hidden_states: Vec<Array1<f32>> = (0..self.num_layers)
            .map(|_| Array1::zeros(self.hidden_size))
            .collect();
        let mut cell_states: Vec<Array1<f32>> = (0..self.num_layers)
            .map(|_| Array1::zeros(self.hidden_size))
            .collect();

        // Process each timestep
        for input_vec in sequence {
            let mut layer_input = Array1::from_vec(input_vec.clone());
            
            // Process through each LSTM layer
            for (layer_idx, lstm_cell) in lstm_cells.iter().enumerate() {
                let (new_hidden, new_cell) = lstm_cell.forward(
                    &layer_input,
                    &hidden_states[layer_idx],
                    &cell_states[layer_idx],
                );
                
                hidden_states[layer_idx] = new_hidden.clone();
                cell_states[layer_idx] = new_cell;
                layer_input = new_hidden; // Output of this layer becomes input to next layer
            }
        }

        // Use final hidden state from last layer as sequence representation
        let final_hidden = hidden_states.last().unwrap();
        let output = self.output_network.run(&final_hidden.to_vec());
        Ok(output)
    }

    /// Process sequence through GRU layers
    fn process_gru_sequence(&self, sequence: &[Vec<f32>]) -> Result<Vec<f32>> {
        let gru_cells = self.gru_cells.as_ref().ok_or_else(|| anyhow!("GRU cells not initialized"))?;
        
        // Initialize hidden states for all layers
        let mut hidden_states: Vec<Array1<f32>> = (0..self.num_layers)
            .map(|_| Array1::zeros(self.hidden_size))
            .collect();

        // Process each timestep
        for input_vec in sequence {
            let mut layer_input = Array1::from_vec(input_vec.clone());
            
            // Process through each GRU layer
            for (layer_idx, gru_cell) in gru_cells.iter().enumerate() {
                let new_hidden = gru_cell.forward(&layer_input, &hidden_states[layer_idx]);
                hidden_states[layer_idx] = new_hidden.clone();
                layer_input = new_hidden; // Output of this layer becomes input to next layer
            }
        }

        // Use final hidden state from last layer as sequence representation
        let final_hidden = hidden_states.last().unwrap();
        let output = self.output_network.run(&final_hidden.to_vec());
        Ok(output)
    }

    /// Extract temporal patterns from memory sequences
    pub fn extract_temporal_patterns(&self, memories: &[AgentMemory]) -> Result<Vec<f32>> {
        if memories.is_empty() {
            return Ok(vec![0.0; self.hidden_size]);
        }

        // Sort memories by timestamp to create temporal sequence
        let mut sorted_memories = memories.to_vec();
        sorted_memories.sort_by(|a, b| a.created_at.cmp(&b.created_at));

        // Convert memories to embedding sequences (placeholder - would use actual embeddings)
        let memory_embeddings: Vec<Vec<f32>> = sorted_memories
            .iter()
            .map(|memory| self.memory_to_embedding(memory))
            .collect();

        self.process_sequence(&memory_embeddings)
    }

    /// Convert memory to embedding (simplified implementation)
    fn memory_to_embedding(&self, memory: &AgentMemory) -> Vec<f32> {
        // This is a simplified implementation - in practice, use the neural embedding service
        let mut embedding = vec![0.0; self.input_size];
        
        // Encode memory type
        let type_encoding = match memory.memory_type {
            MemoryType::Conversation => 0.1,
            MemoryType::Task => 0.2,
            MemoryType::Learning => 0.3,
            MemoryType::Context => 0.4,
            MemoryType::Tool => 0.5,
            MemoryType::Error => 0.6,
            MemoryType::Success => 0.7,
            MemoryType::Pattern => 0.8,
        };
        
        if !embedding.is_empty() {
            embedding[0] = type_encoding;
        }
        
        // Encode content length (normalized)
        if embedding.len() > 1 {
            embedding[1] = (memory.content.len() as f32 / 1000.0).min(1.0);
        }
        
        // Encode relevance score
        if embedding.len() > 2 {
            embedding[2] = memory.relevance_score;
        }
        
        // Encode access count (normalized)
        if embedding.len() > 3 {
            embedding[3] = (memory.access_count as f32 / 100.0).min(1.0);
        }

        // Fill rest with character-based features
        let content_chars: Vec<char> = memory.content.chars().collect();
        for (i, &ch) in content_chars.iter().enumerate() {
            if i + 4 >= embedding.len() {
                break;
            }
            embedding[i + 4] = (ch as u32 as f32) / 65536.0; // Normalize Unicode
        }

        embedding
    }
}

/// Memory sequence analyzer for different memory types
pub struct MemorySequenceAnalyzer {
    /// Specialized sequence models for different memory types
    models: HashMap<MemoryType, MemorySequenceModel>,
    /// General sequence model for mixed memory types
    general_model: MemorySequenceModel,
}

impl MemorySequenceAnalyzer {
    /// Create a new memory sequence analyzer
    pub fn new(input_size: usize, hidden_size: usize, output_size: usize) -> Result<Self> {
        let mut models = HashMap::new();
        
        // Create specialized models for each memory type
        models.insert(
            MemoryType::Conversation,
            MemorySequenceModel::new(SequenceModelType::LSTM, input_size, hidden_size, output_size, 2)?
        );
        
        models.insert(
            MemoryType::Task,
            MemorySequenceModel::new(SequenceModelType::GRU, input_size, hidden_size, output_size, 2)?
        );
        
        models.insert(
            MemoryType::Learning,
            MemorySequenceModel::new(SequenceModelType::LSTM, input_size, hidden_size * 2, output_size, 3)?
        );
        
        models.insert(
            MemoryType::Pattern,
            MemorySequenceModel::new(SequenceModelType::GRU, input_size, hidden_size, output_size, 1)?
        );

        // General model for mixed sequences
        let general_model = MemorySequenceModel::new(
            SequenceModelType::LSTM, 
            input_size, 
            hidden_size, 
            output_size, 
            2
        )?;

        Ok(Self {
            models,
            general_model,
        })
    }

    /// Analyze memory sequence with appropriate specialized model
    pub fn analyze_sequence(&self, memories: &[AgentMemory]) -> Result<Vec<f32>> {
        if memories.is_empty() {
            return Ok(vec![0.0; 128]); // Default output size
        }

        // Determine dominant memory type in sequence
        let mut type_counts = HashMap::new();
        for memory in memories {
            *type_counts.entry(memory.memory_type.clone()).or_insert(0) += 1;
        }

        let dominant_type = type_counts
            .iter()
            .max_by_key(|(_, &count)| count)
            .map(|(memory_type, _)| memory_type.clone());

        // Use specialized model if available, otherwise use general model
        match dominant_type {
            Some(memory_type) if self.models.contains_key(&memory_type) => {
                self.models[&memory_type].extract_temporal_patterns(memories)
            }
            _ => {
                self.general_model.extract_temporal_patterns(memories)
            }
        }
    }

    /// Detect memory patterns across time
    pub fn detect_patterns(&self, memories: &[AgentMemory]) -> Result<MemoryPatternAnalysis> {
        if memories.is_empty() {
            return Ok(MemoryPatternAnalysis::default());
        }

        // Sort memories by timestamp
        let mut sorted_memories = memories.to_vec();
        sorted_memories.sort_by(|a, b| a.created_at.cmp(&b.created_at));

        // Analyze sequence with general model
        let sequence_embedding = self.general_model.extract_temporal_patterns(&sorted_memories)?;

        // Analyze patterns by memory type
        let mut type_patterns = HashMap::new();
        for memory_type in [
            MemoryType::Conversation,
            MemoryType::Task,
            MemoryType::Learning,
            MemoryType::Pattern,
        ] {
            let type_memories: Vec<_> = sorted_memories
                .iter()
                .filter(|m| m.memory_type == memory_type)
                .cloned()
                .collect();
            
            if !type_memories.is_empty() {
                if let Some(model) = self.models.get(&memory_type) {
                    let pattern = model.extract_temporal_patterns(&type_memories)?;
                    type_patterns.insert(memory_type, pattern);
                }
            }
        }

        Ok(MemoryPatternAnalysis {
            overall_pattern: sequence_embedding,
            type_patterns,
            sequence_length: sorted_memories.len(),
            time_span: sorted_memories.last().unwrap().created_at.signed_duration_since(
                sorted_memories.first().unwrap().created_at
            ).num_seconds() as f32,
        })
    }
}

/// Analysis result for memory patterns
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryPatternAnalysis {
    /// Overall sequence pattern
    pub overall_pattern: Vec<f32>,
    /// Patterns by memory type
    pub type_patterns: HashMap<MemoryType, Vec<f32>>,
    /// Length of the sequence
    pub sequence_length: usize,
    /// Time span of the sequence in seconds
    pub time_span: f32,
}

impl Default for MemoryPatternAnalysis {
    fn default() -> Self {
        Self {
            overall_pattern: vec![0.0; 128],
            type_patterns: HashMap::new(),
            sequence_length: 0,
            time_span: 0.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_lstm_cell_creation() {
        let lstm = LSTMCell::new(10, 20);
        assert_eq!(lstm.input_size, 10);
        assert_eq!(lstm.hidden_size, 20);
    }

    #[test]
    fn test_gru_cell_creation() {
        let gru = GRUCell::new(10, 20);
        assert_eq!(gru.input_size, 10);
        assert_eq!(gru.hidden_size, 20);
    }

    #[test]
    fn test_memory_sequence_model_creation() {
        let model = MemorySequenceModel::new(
            SequenceModelType::LSTM,
            32,
            64,
            128,
            2,
        ).unwrap();

        assert_eq!(model.input_size, 32);
        assert_eq!(model.hidden_size, 64);
        assert_eq!(model.num_layers, 2);
        assert!(model.lstm_cells.is_some());
        assert!(model.gru_cells.is_none());
    }

    #[test]
    fn test_sequence_processing() {
        let model = MemorySequenceModel::new(
            SequenceModelType::GRU,
            10,
            20,
            30,
            1,
        ).unwrap();

        let sequence = vec![
            vec![0.1; 10],
            vec![0.2; 10],
            vec![0.3; 10],
        ];

        let result = model.process_sequence(&sequence).unwrap();
        assert_eq!(result.len(), 30); // Output size
    }

    #[test]
    fn test_memory_sequence_analyzer() {
        let analyzer = MemorySequenceAnalyzer::new(32, 64, 128).unwrap();
        
        let memories = vec![
            AgentMemory::new(
                "agent1".to_string(),
                MemoryType::Task,
                "Task 1".to_string(),
            ),
            AgentMemory::new(
                "agent1".to_string(),
                MemoryType::Task,
                "Task 2".to_string(),
            ),
        ];

        let analysis = analyzer.analyze_sequence(&memories).unwrap();
        assert_eq!(analysis.len(), 128);
    }
}