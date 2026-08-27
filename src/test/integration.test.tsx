import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../App';

describe('AnnotateX Studio (Integration Tests)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders application with clean dataset manager and sober header', () => {
    render(<App />);
    expect(screen.getAllByText(/AnnotateX/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Início/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Visão Computacional/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/NLP \/ LLMs/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Áudio/i).length).toBeGreaterThan(0);
  });

  it('navigates seamlessly across Home Hub, NLP Studio, and Audio Studio', () => {
    render(<App />);

    // 1. Check HOME view active
    expect(screen.getByText(/Gerenciador de Datasets/i)).toBeInTheDocument();

    // 2. Navigate to NLP & LLMs Workspace via Header button
    const nlpNavButtons = screen.getAllByRole('button', { name: /NLP \/ LLMs/i });
    fireEvent.click(nlpNavButtons[0]);
    expect(screen.getByText(/Processamento de Texto/i)).toBeInTheDocument();
    expect(screen.getByText(/Extractive QA \(SQuAD\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Text-to-SQL \/ Código/i)).toBeInTheDocument();
    expect(screen.getByText(/Raciocínio & CoT/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exportar Dataset/i })).toBeInTheDocument();

    // 3. Navigate to Audio Workspace
    const audioNavButtons = screen.getAllByRole('button', { name: /Áudio/i });
    fireEvent.click(audioNavButtons[0]);
    expect(screen.getAllByText(/Áudio e Fala/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/ASR \(Transcrição\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Diarização de Locutores/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exportar Dataset/i })).toBeInTheDocument();

    // 4. Navigate to Visão Computacional
    const visionNavButtons = screen.getAllByRole('button', { name: /Visão Computacional/i });
    fireEvent.click(visionNavButtons[0]);
    expect(screen.getByText(/Classes & Schemas/i)).toBeInTheDocument();
  });

  it('opens New Dataset Modal with domain and exact paradigm selector', () => {
    render(<App />);

    const newDatasetBtns = screen.getAllByText(/Novo Dataset/i);
    fireEvent.click(newDatasetBtns[0]);

    expect(screen.getByText(/Criar Novo Dataset/i)).toBeInTheDocument();
    expect(screen.getByText(/1\. Domínio de Trabalho:/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Tipo de Tarefa \/ Formato/i)).toBeInTheDocument();

    // Switch domain to NLP in modal
    const nlpModalCards = screen.getAllByText(/Processamento de Texto \(NLP\)/i);
    fireEvent.click(nlpModalCards[nlpModalCards.length - 1]);
    expect(screen.getAllByText(/Extractive QA/i).length).toBeGreaterThan(0);

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(screen.queryByText(/Criar Novo Dataset/i)).not.toBeInTheDocument();
  });

  it('triggers dataset-bound export directly from Home Hub project card', () => {
    render(<App />);

    const exportDatasetBtns = screen.getAllByRole('button', { name: /Exportar/i });
    fireEvent.click(exportDatasetBtns[0]);

    expect(screen.getByText(/Exportar Dataset:/i)).toBeInTheDocument();
    expect(screen.getByText(/YOLO \(ZIP\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Apache Parquet/i)).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Exportar Dataset:/i)).not.toBeInTheDocument();
  });
});
