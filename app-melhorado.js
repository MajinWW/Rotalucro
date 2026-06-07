// ===================================================================
// APLICAÇÃO DE CONTROLE FINANCEIRO - VERSÃO MELHORADA
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // ===================================================================
    // 1. CONFIGURAÇÃO E CONSTANTES
    // ===================================================================
    const CONFIG = {
        storageKey: 'transacoes_rota',
        moedaOpcoes: { style: 'currency', currency: 'BRL' },
        dataOpcoes: { dateStyle: 'short', timeStyle: 'short' }
    };

    // ===================================================================
    // 2. ESTADO DA APLICAÇÃO
    // ===================================================================
    const appState = {
        transacoes: [],
        grafico: null,
        filtroAtivo: 'todos',
        temaEscuro: true,

        // Carrega dados do localStorage
        carregar() {
            const salvo = localStorage.getItem(CONFIG.storageKey);
            this.transacoes = salvo ? JSON.parse(salvo) : [];
        },

        // Salva dados no localStorage
        salvar() {
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(this.transacoes));
        },

        // Limpar todos os dados (com confirmação)
        limpar() {
            if (confirm('⚠️ Tem certeza que deseja apagar TODOS os registros?')) {
                this.transacoes = [];
                this.salvar();
                ui.atualizar();
                notificacao('✅ Dados limpos com sucesso');
            }
        }
    };

    // ===================================================================
    // 3. UTILITÁRIOS
    // ===================================================================
    const utils = {
        formatarMoeda: (valor) => 
            Number(valor).toLocaleString('pt-BR', CONFIG.moedaOpcoes),

        formatarData: (dataISO) => 
            new Date(dataISO).toLocaleString('pt-BR', CONFIG.dataOpcoes),

        parseValor: (valor) => {
            const str = String(valor).trim().replace(',', '.');
            const num = parseFloat(str);
            return isNaN(num) ? 0 : num;
        },

        // Obtém elemento com segurança
        $(id) {
            const el = document.getElementById(id);
            if (!el) console.warn(`⚠️ Elemento não encontrado: ${id}`);
            return el;
        },

        // Formata valor para exibir
        formatarValorExibicao: (valor, tipo) => {
            const sinal = tipo === 'gasto' ? '-' : '+';
            const cor = tipo === 'gasto' ? '#ff3b3b' : '#00ff88';
            return `<span style="color: ${cor}; font-weight: 700;">${sinal}${utils.formatarMoeda(valor)}</span>`;
        }
    };

    // ===================================================================
    // 4. NOTIFICAÇÕES
    // ===================================================================
    function notificacao(mensagem, tipo = 'sucesso') {
        const toast = utils.$('toast');
        if (!toast) return;

        toast.innerHTML = `
            <i class="fas fa-${tipo === 'erro' ? 'exclamation-circle' : 'check-circle'}"></i>
            <span>${mensagem}</span>
        `;
        toast.classList.add('show');

        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // ===================================================================
    // 5. NAVEGAÇÃO E ABAS
    // ===================================================================
    function configurarNavegacao() {
        const navItems = document.querySelectorAll('.nav-item');
        const views = document.querySelectorAll('.view');

        navItems.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                
                navItems.forEach(n => n.classList.remove('active'));
                views.forEach(v => v.classList.remove('active'));
                
                btn.classList.add('active');
                const targetId = btn.getAttribute('data-target');
                const targetView = utils.$(targetId);
                
                if (targetView) {
                    targetView.classList.add('active');
                }
            });
        });
    }

    // ===================================================================
    // 6. CÁLCULOS E ANÁLISES
    // ===================================================================
    const calculos = {
        // Retorna transações filtradas por período
        filtrar(transacoes, periodo) {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            return transacoes.filter(t => {
                const dataTx = new Date(t.data);
                dataTx.setHours(0, 0, 0, 0);

                switch(periodo) {
                    case 'hoje':
                        return dataTx.getTime() === hoje.getTime();
                    
                    case 'semana':
                        const inicioSemana = new Date(hoje);
                        inicioSemana.setDate(hoje.getDate() - hoje.getDay());
                        return dataTx >= inicioSemana;
                    
                    case 'mes':
                        return dataTx.getMonth() === hoje.getMonth() && 
                               dataTx.getFullYear() === hoje.getFullYear();
                    
                    default:
                        return true;
                }
            });
        },

        // Calcula totais
        totalizacao(transacoes) {
            let ganhos = 0;
            let gastos = 0;

            transacoes.forEach(t => {
                if (t.tipo === 'ganho') ganhos += t.valor;
                if (t.tipo === 'gasto') gastos += t.valor;
            });

            return {
                ganhos,
                gastos,
                lucro: ganhos - gastos,
                contagem: transacoes.length
            };
        },

        // Agrupa transações por categoria
        agruparPorCategoria(transacoes) {
            const agrupado = {};

            transacoes.forEach(t => {
                const cat = t.categoria || 'Sem categoria';
                if (!agrupado[cat]) agrupado[cat] = [];
                agrupado[cat].push(t);
            });

            return agrupado;
        }
    };

    // ===================================================================
    // 7. INTERFACE - ATUALIZAÇÃO
    // ===================================================================
    const ui = {
        atualizar() {
            const periodo = utils.$('filtro-periodo')?.value || 'todos';
            const transacoes = calculos.filtrar(appState.transacoes, periodo);
            const totais = calculos.totalizacao(transacoes);

            // Atualiza cards
            this.atualizarCards(totais);

            // Atualiza lista
            this.atualizarLista(transacoes);

            // Atualiza gráfico
            this.atualizarGrafico(totais);
        },

        atualizarCards(totais) {
            const elGanhos = utils.$('val-ganhos');
            const elGastos = utils.$('val-gastos');
            const elLucro = utils.$('val-lucro');

            if (elGanhos) elGanhos.innerText = utils.formatarMoeda(totais.ganhos);
            if (elGastos) elGastos.innerText = utils.formatarMoeda(totais.gastos);
            
            if (elLucro) {
                elLucro.innerText = utils.formatarMoeda(totais.lucro);
                elLucro.className = totais.lucro < 0 ? 'valor-lucro neon-red-text' : 'valor-lucro neon-text';
            }
        },

        atualizarLista(transacoes) {
            const lista = utils.$('lista-transacoes');
            if (!lista) return;

            lista.innerHTML = '';

            if (transacoes.length === 0) {
                lista.innerHTML = '<p class="empty-state">📭 Nenhuma transação neste período</p>';
                return;
            }

            transacoes.forEach((t, idx) => {
                const li = document.createElement('li');
                li.className = `transacao ${t.tipo}`;
                li.innerHTML = `
                    <div class="t-info">
                        <span class="t-cat">${t.tipo === 'ganho' ? '🚕 CORRIDA' : `📌 ${t.categoria}`}</span>
                        <span class="t-data">${utils.formatarData(t.data)}</span>
                    </div>
                    <div class="t-actions">
                        <span class="t-valor">${utils.formatarValorExibicao(t.valor, t.tipo)}</span>
                        <button class="btn-delete" onclick="app.deletarTransacao(${idx})" title="Deletar">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                lista.appendChild(li);
            });
        },

        atualizarGrafico(totais) {
            try {
                if (typeof Chart === 'undefined') return;
                
                const canvas = utils.$('meuGrafico');
                if (!canvas) return;

                const ctx = canvas.getContext('2d');
                const valG = totais.ganhos || 0.1;
                const valD = totais.gastos || 0.1;
                const cores = (totais.ganhos === 0 && totais.gastos === 0) 
                    ? ['#333', '#333'] 
                    : ['#00ff88', '#ff3b3b'];

                if (appState.grafico) {
                    appState.grafico.data.datasets[0].data = [valG, valD];
                    appState.grafico.data.datasets[0].backgroundColor = cores;
                    appState.grafico.update();
                } else {
                    appState.grafico = new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: ['💰 Ganhos', '💸 Gastos'],
                            datasets: [{
                                data: [valG, valD],
                                backgroundColor: cores,
                                borderWidth: 0
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            cutout: '80%',
                            plugins: { legend: { display: false } }
                        }
                    });
                }
            } catch (e) {
                console.warn('⚠️ Erro ao atualizar gráfico:', e);
            }
        }
    };

    // ===================================================================
    // 8. REGISTRO DE TRANSAÇÕES
    // ===================================================================
    function registrarTransacao(tipo, valorBruto, categoria = '') {
        const valorNum = utils.parseValor(valorBruto);

        if (valorNum <= 0) {
            notificacao('❌ Valor deve ser maior que zero', 'erro');
            return false;
        }

        appState.transacoes.unshift({
            id: Date.now(),
            tipo,
            valor: valorNum,
            categoria: categoria || 'Outro',
            data: new Date().toISOString()
        });

        appState.salvar();
        ui.atualizar();
        notificacao(`✅ ${tipo === 'ganho' ? 'Corrida' : 'Gasto'} registrado!`);

        // Volta para o dashboard
        const navDashboard = document.querySelector('[data-target="view-dashboard"]');
        if (navDashboard) navDashboard.click();

        return true;
    }

    // ===================================================================
    // 9. CONFIGURAR FORMULÁRIOS
    // ===================================================================
    function configurarFormularios() {
        const formGanho = utils.$('form-ganho');
        const formGasto = utils.$('form-gasto');

        if (formGanho) {
            formGanho.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = utils.$('input-ganho');
                registrarTransacao('ganho', input.value);
                if (input) input.value = '';
            });
        }

        if (formGasto) {
            formGasto.addEventListener('submit', (e) => {
                e.preventDefault();
                const inputValor = utils.$('input-gasto');
                const selectCat = utils.$('categoria-gasto');
                registrarTransacao('gasto', inputValor.value, selectCat.value);
                if (inputValor) inputValor.value = '';
                if (selectCat) selectCat.value = '';
            });
        }

        // Listener do filtro
        const filtro = utils.$('filtro-periodo');
        if (filtro) {
            filtro.addEventListener('change', () => ui.atualizar());
        }
    }

    // ===================================================================
    // 10. FUNÇÕES GLOBAIS
    // ===================================================================
    window.app = {
        // Deletar uma transação
        deletarTransacao(idx) {
            if (confirm('Tem certeza que deseja deletar esta transação?')) {
                appState.transacoes.splice(idx, 1);
                appState.salvar();
                ui.atualizar();
                notificacao('🗑️ Transação deletada');
            }
        },

        // Exportar dados como JSON
        exportarDados() {
            const dados = {
                gerado: new Date().toISOString(),
                totalTransacoes: appState.transacoes.length,
                transacoes: appState.transacoes
            };

            const json = JSON.stringify(dados, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rota-lucro-backup-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);

            notificacao('📥 Dados exportados com sucesso');
        },

        // Importar dados
        importarDados(arquivo) {
            if (!arquivo) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const dados = JSON.parse(e.target.result);
                    appState.transacoes = dados.transacoes || [];
                    appState.salvar();
                    ui.atualizar();
                    notificacao('✅ Dados importados com sucesso');
                } catch (erro) {
                    notificacao('❌ Erro ao importar arquivo', 'erro');
                    console.error(erro);
                }
            };
            reader.readAsText(arquivo);
        },

        // Limpar dados
        limparDados() {
            appState.limpar();
        },

        // Gerar relatório
        gerarRelatorio() {
            const periodo = utils.$('filtro-periodo').value;
            const transacoes = calculos.filtrar(appState.transacoes, periodo);
            const totais = calculos.totalizacao(transacoes);
            const agrupado = calculos.agruparPorCategoria(transacoes.filter(t => t.tipo === 'gasto'));

            let relatorio = `
📊 RELATÓRIO DE TRANSAÇÕES
==========================
Período: ${periodo.toUpperCase()}
Data gerada: ${new Date().toLocaleString('pt-BR')}

💰 RESUMO GERAL
===============
Ganhos: ${utils.formatarMoeda(totais.ganhos)}
Gastos: ${utils.formatarMoeda(totais.gastos)}
Lucro: ${utils.formatarMoeda(totais.lucro)}
Total de transações: ${totais.contagem}

📌 GASTOS POR CATEGORIA
========================
`;
            
            Object.entries(agrupado).forEach(([cat, items]) => {
                const total = items.reduce((acc, t) => acc + t.valor, 0);
                relatorio += `${cat}: ${utils.formatarMoeda(total)} (${items.length}x)\n`;
            });

            console.log(relatorio);
            alert(relatorio);
        }
    };

    // ===================================================================
    // 11. INICIALIZAÇÃO
    // ===================================================================
    function inicializar() {
        appState.carregar();
        configurarNavegacao();
        configurarFormularios();
        ui.atualizar();
        notificacao('🚀 Aplicação iniciada');
    }

    inicializar();
});
