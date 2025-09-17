document.addEventListener('DOMContentLoaded', () => {
    const arquivoInput = document.getElementById('arquivoInput');
    const dataInicioInput = document.getElementById('dataInicio');
    const dataFimInput = document.getElementById('dataFim');
    const elementoSelecionadoSelect = document.getElementById('elementoSelecionado'); 
    const modalidadeGraficoSelect = document.getElementById('modalidadeGrafico');
    const gerarGraficoBtn = document.getElementById('gerarGraficoBtn');
    const areaGrafico = document.getElementById('areaGrafico');
    const messageBox = document.getElementById('message-box');
    const limparCacheBtn = document.getElementById('limparCacheBtn');
    const salvarArquivoBtn = document.getElementById('salvarArquivoBtn');
    
    // Elementos do novo modal
    const saveModal = document.getElementById('saveModal');
    const saveFileNameInput = document.getElementById('saveFileNameInput');
    const confirmSaveBtn = document.getElementById('confirmSaveBtn');
    const cancelSaveBtn = document = document.getElementById('cancelSaveBtn');

    let dadosFinanceiros = []; 
    let currentFileName = null;

    // Função para exibir mensagens temporárias para o usuário
    function showMessage(message, type = 'success') {
        messageBox.textContent = message;
        messageBox.className = `message-box ${type}`;
        messageBox.style.display = 'block';
        setTimeout(() => {
            messageBox.style.display = 'none';
        }, 2000); // Esconde a mensagem depois de 2 segundos
    }

    // Função auxiliar para converter a data do formato 'dd/mm/yyyy' para 'yyyy-mm-dd'
    function converterData(dataStr) {
        if (!dataStr) return '';
        const partes = dataStr.split('/');
        // Verifica se a data tem o formato esperado
        if (partes.length === 3) {
            return `${partes[2]}-${partes[1]}-${partes[0]}`;
        }
        return dataStr; // Retorna a string original se o formato for diferente
    }

    // Função principal para processar os dados do arquivo
    function processarDados(dados, nomeArquivo) {
        dadosFinanceiros = dados;
        // Ordena os dados por data
        dadosFinanceiros.sort((a, b) => new Date(converterData(a.Data)) - new Date(converterData(b.Data)));
        
        // Adiciona o novo campo "Renda Variável" para cada item
        dadosFinanceiros.forEach(item => {
            const xpValor = Number(item.XP) || 0;
            const rendaFixaValor = Number(item['Renda Fixa']) || 0;
            item['Renda Variável'] = xpValor - rendaFixaValor;
        });

        if (dadosFinanceiros.length > 0) {
            const chavesNumericasIdentificadas = new Set(); 
            
            // Itera sobre todos os dados para identificar todas as chaves numéricas
            dadosFinanceiros.forEach(item => {
                 for (const key in item) {
                    // Tenta converter o valor para um número e verifica se não é NaN
                    const valorConvertido = Number(item[key]);
                    // Filtra as chaves de dados que não são numéricos
                    if (!isNaN(valorConvertido) && key !== 'Data' && key !== 'Comentario' && key !== 'OutrasDesc') {
                        chavesNumericasIdentificadas.add(key); 
                    }
                 }
            });

            elementoSelecionadoSelect.innerHTML = ''; 
            chavesNumericasIdentificadas.forEach(key => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = key;
                elementoSelecionadoSelect.appendChild(option);
            });

            if (elementoSelecionadoSelect.options.length > 0) {
                fileStatusMessage.textContent = `Arquivo "${nomeArquivo}" carregado com sucesso!`;
                salvarArquivoBtn.disabled = false;
                return true;
            } else {
                fileStatusMessage.textContent = 'Erro: nenhum elemento numérico encontrado.';
                salvarArquivoBtn.disabled = true;
                return false;
            }
        } else {
            fileStatusMessage.textContent = 'Erro: o arquivo JSON está vazio.';
            salvarArquivoBtn.disabled = true;
            return false;
        }
    }

    // Carrega dados do LocalStorage ao iniciar
    function carregarDadosIniciais() {
        const dadosArmazenados = localStorage.getItem('dadosFinanceiros');
        const nomeArquivoSalvo = localStorage.getItem('nomeArquivo');
        if (dadosArmazenados) {
            try {
                processarDados(JSON.parse(dadosArmazenados), nomeArquivoSalvo || 'dados-salvos');
                currentFileName = nomeArquivoSalvo || 'dados-financeiros-modificado.json';
                fileStatusMessage.textContent = 'Dados da sessão anterior carregados com sucesso!';
                showMessage(`Dados da sessão anterior carregados com sucesso!`, 'success');
            } catch (e) {
                console.error('Erro ao carregar dados do LocalStorage:', e);
                localStorage.removeItem('dadosFinanceiros'); // Limpa dados corrompidos
                localStorage.removeItem('nomeArquivo');
                fileStatusMessage.textContent = 'Erro ao carregar os dados salvos.';
                showMessage('Dados armazenados localmente estão corrompidos. Por favor, carregue um novo arquivo.', 'error');
            }
        } else {
             fileStatusMessage.textContent = 'Nenhum arquivo escolhido.';
        }
    }
    
    // Função para acionar o download do arquivo JSON
    function downloadFile(filename) {
        if (dadosFinanceiros.length > 0) {
            const jsonString = JSON.stringify(dadosFinanceiros, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'dados-financeiros-modificado.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showMessage(`Arquivo salvo com sucesso como "${a.download}"!`, 'success');
        } else {
            showMessage('Nenhum dado para salvar.', 'error');
        }
    }

    // Define as datas padrão
    function setDefaultDates() {
        const today = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(today.getMonth() - 1);

        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        dataFimInput.value = formatDate(today);
        dataInicioInput.value = formatDate(oneMonthAgo);
    }

    // Evento para carregar o arquivo quando o usuário seleciona um
    arquivoInput.addEventListener('change', (event) => {
        const arquivo = event.target.files[0];
        if (arquivo) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const dados = JSON.parse(e.target.result);
                    const processamentoOk = processarDados(dados, arquivo.name);
                    if (processamentoOk) {
                        // Salva os dados e o nome do arquivo no LocalStorage
                        localStorage.setItem('dadosFinanceiros', JSON.stringify(dados));
                        localStorage.setItem('nomeArquivo', arquivo.name);
                        currentFileName = arquivo.name;
                        showMessage(`Arquivo "${arquivo.name}" carregado com sucesso! Agora, selecione os elementos e as datas.`, 'success');
                    } else {
                        // O arquivo é um JSON válido, mas não contém os dados esperados.
                        showMessage('Nenhum elemento numérico encontrado para plotar no arquivo.', 'error');
                    }
                } catch (error) {
                    showMessage('Erro ao ler o arquivo. Certifique-se de que é um arquivo JSON válido.', 'error');
                    console.error('Erro de leitura/parsing:', error);
                }
            };
            reader.readAsText(arquivo);
        } else {
             fileStatusMessage.textContent = 'Nenhum arquivo escolhido.';
        }
    });

    // Evento para limpar o cache de dados e recarregar a página
    limparCacheBtn.addEventListener('click', () => {
        localStorage.removeItem('dadosFinanceiros');
        localStorage.removeItem('nomeArquivo');
        currentFileName = null;
        window.location.reload();
    });

    // Evento para abrir o modal de salvar arquivo
    salvarArquivoBtn.addEventListener('click', () => {
        if (dadosFinanceiros.length > 0) {
            saveFileNameInput.value = currentFileName || 'dados-financeiros-modificado.json';
            saveModal.classList.remove('hidden');
        } else {
            showMessage('Nenhum dado para salvar.', 'error');
        }
    });

    // Evento para confirmar o nome do arquivo e iniciar o download
    confirmSaveBtn.addEventListener('click', () => {
        const filename = saveFileNameInput.value;
        if (filename.trim() === '') {
            showMessage('O nome do arquivo não pode ser vazio.', 'error');
            return;
        }
        downloadFile(filename);
        saveModal.classList.add('hidden');
    });

    // Evento para cancelar a operação de salvar arquivo
    cancelSaveBtn.addEventListener('click', () => {
        saveModal.classList.add('hidden');
    });

    // Fecha o modal se o usuário clicar fora dele
    saveModal.addEventListener('click', (event) => {
        if (event.target === saveModal) {
            saveModal.classList.add('hidden');
        }
    });

    // Evento para gerar o gráfico
    gerarGraficoBtn.addEventListener('click', () => {
        if (dadosFinanceiros.length === 0) {
            showMessage('Por favor, carregue um arquivo JSON primeiro.', 'error');
            return;
        }

        const dataInicio = dataInicioInput.value;
        const dataFim = dataFimInput.value;
        const modalidade = modalidadeGraficoSelect.value;
        
        let elementosSelecionados = Array.from(elementoSelecionadoSelect.options)
                                       .filter(option => option.selected)
                                       .map(option => option.value);

        if (modalidade === 'diferencaReais') {
            elementosSelecionados = elementosSelecionados.filter(el => el !== 'IBOV');
            if (elementosSelecionados.length === 0) {
                showMessage('Para a modalidade "Diferença em Reais", selecione pelo menos um investimento além do IBOV.', 'error');
                return;
            }
        }

        if (!dataInicio || !dataFim || elementosSelecionados.length === 0) {
            showMessage('Por favor, preencha todos os campos: data de início, data final e selecione pelo menos um elemento.', 'error');
            return;
        }

        let dadosPorData = dadosFinanceiros.filter(item => {
            const dataItemConvertida = converterData(item.Data);
            return dataItemConvertida >= dataInicio && dataItemConvertida <= dataFim;
        });

        if (dadosPorData.length === 0) {
            showMessage('Nenhum dado encontrado para o período selecionado.', 'error');
            areaGrafico.innerHTML = '<p style="text-align:center;">Nenhum dado válido para o período selecionado.</p>';
            return;
        }

        const traces = [];
        let yAxisTitle = '';
        let graphTitlePrefix = '';
        let tickFormatY = '';
        const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];


        if (modalidade === 'percentual') {
            yAxisTitle = 'Variação Percentual (%)';
            graphTitlePrefix = 'Variação Percentual';
            tickFormatY = ',.1f';
        } else {
            yAxisTitle = 'Diferença em Reais (R$)';
            graphTitlePrefix = 'Diferença em Reais';
            tickFormatY = '$,.2f';
        }

        elementosSelecionados.forEach((elemento, index) => {
            const dadosFiltradosParaElemento = dadosPorData.filter(item => {
                const valor = Number(item[elemento]);
                // Filtra apenas valores válidos (números) e que não sejam zero
                return !isNaN(valor) && valor !== 0;
            });

            if (dadosFiltradosParaElemento.length === 0) {
                console.warn(`Nenhum dado válido para o elemento "${elemento}" no período selecionado (valores ausentes ou zero).`);
                return; 
            }
            
            // Define a cor da linha a partir da paleta de cores.
            const lineColor = colors[index % colors.length];

            const valorInicial = Number(dadosFiltradosParaElemento[0][elemento]);

            if (valorInicial === 0 && modalidade === 'percentual') {
                    console.warn(`O valor inicial para "${elemento}" é zero, impossível calcular variação percentual.`);
                    return; 
            }
            
            // Arrays para os dados do gráfico
            const x = dadosFiltradosParaElemento.map(item => item.Data);
            let y;
            if (modalidade === 'percentual') {
                 y = dadosFiltradosParaElemento.map(item => ((Number(item[elemento]) / valorInicial) - 1) * 100);
            } else {
                y = dadosFiltradosParaElemento.map(item => Number(item[elemento]) - valorInicial);
            }
            
            // Apenas o conteúdo do comentário, sem o "Comentário:"
            const comentarios = dadosFiltradosParaElemento.map(item => item.Comentario);

            traces.push({
                x: x,
                y: y,
                mode: 'lines+markers',
                type: 'scatter',
                name: elemento,
                customdata: comentarios,
                hovertemplate: '<b>Data</b>: %{x}<br><b>Valor</b>: %{y}<br>%{customdata}<extra></extra>'
            });
        });

        if (traces.length === 0) {
            showMessage('Nenhum dado válido para os elementos selecionados. Não foi possível gerar o gráfico.', 'error');
            areaGrafico.innerHTML = '<p style="text-align:center;">Nenhum dado válido para o período ou elementos selecionados.</p>';
            return;
        }

        const layout = {
            title: `${graphTitlePrefix} de ${elementosSelecionados.join(', ')} de ${dataInicio} a ${dataFim}`,
            xaxis: {
                title: 'Data',
                tickangle: 45 
            },
            yaxis: {
                title: yAxisTitle,
                tickformat: tickFormatY 
            },
            hovermode: 'closest',
            hoverlabel: {
                bgcolor: '#2d3748',
                font: {
                    color: '#FFD700' 
                }
            },
            legend: {
                orientation: 'h', 
                yanchor: 'bottom',
                y: 1.02,
                xanchor: 'right',
                x: 1
            }
        };

        Plotly.newPlot(areaGrafico, traces, layout);
    });

    carregarDadosIniciais();
    setDefaultDates();
});
