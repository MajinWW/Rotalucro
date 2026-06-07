// ===================================================================
// ROTACOFRE v2.0 - APLICAÇÃO DE POUPANÇA INTELIGENTE
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {

    // ===================================================================
    // 1. CONFIGURAÇÃO E CONSTANTES
    // ===================================================================
    const CONFIG = {
        storageKey: 'rotaCofreApp',
        moedaOpcoes: { style: 'currency', currency: 'BRL' },
        selicdiaaria: 0.000285, // ~10.5% ao ano
        diasanobaseado: 365
    };

    // ===================================================================
    // 2. ESTADO DA APLICAÇÃO
    // ===================================================================
    const appState = {
        historico: [],
        meta: 50000,
        paginaAtiva: 'home',

        carregar() {
            const salvo = localStorage.getItem(CONFIG.storageKey);
            if (salvo) {
                const dados = JSON.parse(salvo);
                this.historico = dados.historico || [];
                this.meta = dados.meta || 50000;
            }
        },

        salvar() {
            localStorage.setItem(CONFIG.storageKey, JSON.stringify({
                historico: this.historico,
                meta: this.meta
            }));
        },

        obterTotal() {
            return this.historico.reduce((acc, item) => acc + item.valor, 0);
        },

        obterRestante() {
            return Math.max(0, this.meta - this.obterTotal());
        },

        obterProgresso() {
            const total = this.obterTotal();
            return this.meta > 0 ? Math.min(100, (total / this.meta) * 100) : 0;
        }
    };

    // ===================================================================
    // 3. UTILITÁRIOS
    // ===================================================================
    const utils = {
        formatarMoeda: (valor) =>
            Number(valor).toLocaleString('pt-BR', CONFIG.moedaOpcoes),

        formatarData: (dataISO) => {
            const data = new Date(dataISO);
            return data.toLocaleString('pt-BR', { 
                dateStyle: 'short', 
                timeStyle: 'short' 
            });
        },

        parseValor: (valor) => {
            const str = String(valor).trim().replace(',', '.');
            const num = parseFloat(str);
            return isNaN(num) ? 0 : num;
        },

        $(id) {
            const el = document.getElementById(id);
            if (!el) console.warn(`⚠️ Elemento não encontrado: ${id}`);
            return el;
        },

        // Calcula juros compostos
        calcularJurosCompostos(capitalInicial, aportesMensais, meses, taxaAnual) {
            let capital = capitalInicial;
            const taxaMensal = Math.pow(1 + taxaAnual, 1/12) - 1;

            for (let i = 0; i < meses; i++) {
                capital = capital * (1 + taxaMensal) + aportesMensais;
            }

            return capital;
        }
    };

    // ===================================================================
    // 4. NOTIFICAÇÕES
    // ===================================================================
    function notificacao(mensagem, tipo = 'sucesso') {
        const toast = utils.$('toast');
        const toastMsg = utils.$('toast-msg');
        
        if (!toast || !toastMsg) return;

        toastMsg.innerText = mensagem;
        toast.classList.add('show');

        // Mudar cor baseado no tipo
        if (tipo === 'erro') {
            toast.style.borderColor = '#ff3b3b';
            toast.style.color = '#ff3b3b';
        } else {
            toast.style.borderColor = '#00b09b';
            toast.style.color = '#fff';
        }

        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // ===================================================================
    // 5. NAVEGAÇÃO
    // ===================================================================
    function mudarPagina(idPagina) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
        });

        const pagina = utils.$(idPagina === 'home' ? 'page-home' : 
                             idPagina === 'simulador' ? 'page-simulador' : 
                             'page-historico');
        if (pagina) pagina.classList.add('active');

        const botao = Array.from(document.querySelectorAll('.nav-item'))
            .find(btn => {
                const page = btn.getAttribute('data-page');
                return page === idPagina;
            });
        if (botao) botao.classList.add('active');

        appState.paginaAtiva = idPagina;
    }

    // ===================================================================
    // 6. INTERFACE - ATUALIZAÇÃO
    // ===================================================================
    const ui = {
        atualizar() {
            const total = appState.obterTotal();
            const restante = appState.obterRestante();
            const progresso = appState.obterProgresso();

            // Atualiza total
            const elTotal = utils.$('total-cofrinho');
            if (elTotal) elTotal.innerText = utils.formatarMoeda(total);

            // Atualiza progresso
            const elBarra = utils.$('barra-progresso');
            const elProgresso = utils.$('texto-progresso');
            if (elBarra) elBarra.style.width = `${progresso}%`;
            if (elProgresso) elProgresso.innerText = `${Math.round(progresso)}%`;

            // Atualiza meta no header
            const elMetaHeader = utils.$('texto-meta-header');
            if (elMetaHeader) elMetaHeader.innerText = utils.formatarMoeda(appState.meta);

            // Atualiza cards
            const elMeta = utils.$('valor-meta');
            const elRestante = utils.$('valor-restante');
            if (elMeta) elMeta.innerText = utils.formatarMoeda(appState.meta);
            if (elRestante) elRestante.innerText = utils.formatarMoeda(restante);

            // Atualiza histórico
            this.atualizarHistorico();
        },

        atualizarHistorico() {
            const lista = utils.$('lista-depositos');
            if (!lista) return;

            lista.innerHTML = '';

            if (appState.historico.length === 0) {
                lista.innerHTML = `
                    <div style="text-align: center; padding: 40px 0; color: #8a8a93;">
                        <p>📭 Nenhum depósito registrado</p>
                    </div>
                `;
                return;
            }

            // Ordena por data (mais recente primeiro)
            const ordenado = [...appState.historico].sort((a, b) => 
                new Date(b.data) - new Date(a.data)
            );

            ordenado.forEach((item, idx) => {
                const li = document.createElement('li');
                li.className = 'deposit-item';
                li.innerHTML = `
                    <div class="d-info">
                        <span class="d-label">💰 Depósito</span>
                        <span class="d-date">${utils.formatarData(item.data)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span class="d-val">${utils.formatarMoeda(item.valor)}</span>
                        <button onclick="app.deletarDeposito(${idx})" 
                                style="background: none; border: none; color: #ff3b3b; cursor: pointer; font-size: 1.2rem;">
                            🗑️
                        </button>
                    </div>
                `;
                lista.appendChild(li);
            });
        }
    };

    // ===================================================================
    // 7. FUNÇÕES PRINCIPAIS
    // ===================================================================
    function adicionarAporte(valor) {
        const valorNum = utils.parseValor(valor);

        if (valorNum <= 0) {
            notificacao('❌ Valor deve ser maior que zero', 'erro');
            return false;
        }

        appState.historico.unshift({
            valor: valorNum,
            data: new Date().toISOString()
        });

        appState.salvar();
        ui.atualizar();
        notificacao(`✅ Aporte de ${utils.formatarMoeda(valorNum)} registrado!`);

        // Limpa input
        const input = utils.$('valor-ganho');
        if (input) input.value = '';

        return true;
    }

    function definirMeta(novaMetaStr) {
        const novaMeta = utils.parseValor(novaMetaStr);

        if (novaMeta <= 0) {
            notificacao('❌ Meta deve ser maior que zero', 'erro');
            return;
        }

        appState.meta = novaMeta;
        appState.salvar();
        ui.atualizar();
        fecharModalMeta();
        notificacao(`✅ Meta atualizada para ${utils.formatarMoeda(novaMeta)}`);
    }

    function simularJuros() {
        const aporteStr = utils.$('aporte-diario-simulado').value;
        const aporte = utils.parseValor(aporteStr);

        if (aporte <= 0) {
            notificacao('❌ Digite um valor para simular', 'erro');
            return;
        }

        const totalAtual = appState.obterTotal();
        const diaMes = 30;
        const aportesMensais = aporte * diaMes;
        const meses = 12;
        const taxaAnual = 0.105; // 10.5%

        const resultado = utils.calcularJurosCompostos(
            totalAtual,
            aportesMensais,
            meses,
            taxaAnual
        );

        const ganho = resultado - totalAtual - (aportesMensais * meses);
        const rendimento = utils.$('resultado-simulacao');

        if (rendimento) {
            rendimento.innerHTML = `
                <div style="text-align: center;">
                    <p style="color: #8a8a93; font-size: 0.9rem; margin-bottom: 15px;">
                        Com aporte diário de ${utils.formatarMoeda(aporte)} durante 12 meses:
                    </p>
                    <div style="background: rgba(0,176,155,0.1); padding: 20px; border-radius: 16px; margin-bottom: 15px;">
                        <p style="color: #8a8a93; font-size: 0.85rem; margin-bottom: 8px;">Total Acumulado</p>
                        <p style="color: #00b09b; font-size: 2rem; font-weight: 700;">${utils.formatarMoeda(resultado)}</p>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div style="background: rgba(100,165,250,0.1); padding: 15px; border-radius: 12px;">
                            <p style="color: #8a8a93; font-size: 0.75rem; margin-bottom: 5px;">Investido</p>
                            <p style="color: #60a5fa; font-weight: 600;">${utils.formatarMoeda(totalAtual + aportesMensais * meses)}</p>
                        </div>
                        <div style="background: rgba(0,176,155,0.1); padding: 15px; border-radius: 12px;">
                            <p style="color: #8a8a93; font-size: 0.75rem; margin-bottom: 5px;">Juros Ganhos</p>
                            <p style="color: #00b09b; font-weight: 600;">${utils.formatarMoeda(ganho)}</p>
                        </div>
                    </div>
                </div>
            `;
            rendimento.style.display = 'block';
        }
    }

    // ===================================================================
    // 8. MODAL
    // ===================================================================
    function abrirModalMeta() {
        const modal = utils.$('modal-meta');
        const input = utils.$('input-meta');
        if (modal) {
            modal.classList.add('active');
            if (input) {
                input.value = appState.meta;
                input.focus();
            }
        }
    }

    function fecharModalMeta() {
        const modal = utils.$('modal-meta');
        if (modal) modal.classList.remove('active');
    }

    // ===================================================================
    // 9. FUNÇÕES GLOBAIS
    // ===================================================================
    window.app = {
        mudarPagina,
        abrirModalMeta,
        fecharModalMeta,
        adicionarAporte,
        definirMeta,
        simularJuros,

        setValorAporte(valor) {
            const input = utils.$('valor-ganho');
            if (input) {
                input.value = valor;
                input.focus();
            }
        },

        deletarDeposito(idx) {
            if (confirm('Tem certeza que deseja deletar este depósito?')) {
                appState.historico.splice(idx, 1);
                appState.salvar();
                ui.atualizar();
                notificacao('🗑️ Depósito deletado');
            }
        },

        exportarDados() {
            const dados = {
                gerado: new Date().toISOString(),
                totalAcumulado: appState.obterTotal(),
                meta: appState.meta,
                historico: appState.historico
            };

            const json = JSON.stringify(dados, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rota-cofre-backup-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);

            notificacao('📥 Dados exportados com sucesso');
        },

        importarDados(arquivo) {
            if (!arquivo) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const dados = JSON.parse(e.target.result);
                    appState.historico = dados.historico || [];
                    appState.meta = dados.meta || 50000;
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

        limparDados() {
            if (confirm('⚠️ Tem certeza que deseja apagar TODOS os dados?')) {
                appState.historico = [];
                appState.meta = 50000;
                appState.salvar();
                ui.atualizar();
                notificacao('✅ Dados limpos com sucesso');
            }
        },

        gerarRelatorio() {
            const total = appState.obterTotal();
            const restante = appState.obterRestante();
            const progresso = appState.obterProgresso();
            const totalDepositos = appState.historico.length;

            let relatorio = `
📊 RELATÓRIO - RotaCofre
==========================
Data: ${new Date().toLocaleString('pt-BR')}

💰 RESUMO FINANCEIRO
====================
Total Acumulado: ${utils.formatarMoeda(total)}
Meta Definida: ${utils.formatarMoeda(appState.meta)}
Falta Investir: ${utils.formatarMoeda(restante)}
Progresso: ${Math.round(progresso)}%

📈 ESTATÍSTICAS
================
Total de Depósitos: ${totalDepositos}
Valor Médio: ${totalDepositos > 0 ? utils.formatarMoeda(total / totalDepositos) : 'N/A'}

📅 ÚLTIMOS DEPÓSITOS
======================
`;

            const ultimosDepositos = [...appState.historico]
                .sort((a, b) => new Date(b.data) - new Date(a.data))
                .slice(0, 10);

            ultimosDepositos.forEach((dep, i) => {
                relatorio += `${i + 1}. ${utils.formatarMoeda(dep.valor)} - ${utils.formatarData(dep.data)}\n`;
            });

            console.log(relatorio);
            alert(relatorio);
        }
    };

    // ===================================================================
    // 10. INICIALIZAÇÃO
    // ===================================================================
    function inicializar() {
        appState.carregar();
        
        // Configurar navegação
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const page = item.getAttribute('data-page');
                if (page) app.mudarPagina(page);
            });
        });

        // Configurar modal (fechar ao clicar fora)
        const modal = utils.$('modal-meta');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) fecharModalMeta();
            });
        }

        // Atualizar UI
        ui.atualizar();

        // Listener para tecla Enter nos inputs
        const inputAporte = utils.$('valor-ganho');
        if (inputAporte) {
            inputAporte.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') app.adicionarAporte(inputAporte.value);
            });
        }

        const inputMeta = utils.$('input-meta');
        if (inputMeta) {
            inputMeta.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') app.definirMeta(inputMeta.value);
            });
        }

        notificacao('🚀 RotaCofre iniciado');
    }

    inicializar();
});
