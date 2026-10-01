package pe.ebyzom.lumen.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import pe.ebyzom.lumen.data.repository.ScriptRepository
import pe.ebyzom.lumen.model.AppSettings
import pe.ebyzom.lumen.model.Script

class ScriptViewModel(private val repository: ScriptRepository) : ViewModel() {

    val allScripts: StateFlow<List<Script>> = repository.allScripts
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _currentScript = MutableStateFlow<Script?>(null)
    val currentScript: StateFlow<Script?> = _currentScript

    private val _settings = MutableStateFlow(AppSettings())
    val settings: StateFlow<AppSettings> = _settings

    init {
        viewModelScope.launch {
            repository.allScripts.collect { list ->
                if (list.isEmpty()) {
                    seedDefaultScripts()
                } else if (_currentScript.value == null) {
                    _currentScript.value = list.first()
                }
            }
        }
    }

    private suspend fun seedDefaultScripts() {
        repository.insertScript(
            Script(
                title = "Discurso de Bienvenida",
                content = """Buenos días a todos. Es un verdadero honor estar aquí hoy con ustedes.

Durante los últimos años, nuestro equipo se propuso resolver una sola pregunta: ¿cómo transformamos la manera en que nos comunicamos con el mundo?

Hoy venimos a presentar una herramienta diseñada con velocidad instantánea, máxima claridad visual y control absoluto de lectura.

Cada línea de texto y cada ajuste fueron creados pensando en un solo objetivo: que tu mensaje sea claro, fluido y natural frente a la cámara.

Muchas gracias.""".trimIndent(),
                wpm = 130,
                fontSize = 44
            )
        )
        repository.insertScript(
            Script(
                title = "Presentación de Proyecto",
                content = """Hola a todos, bienvenidos. Hoy les presento los resultados de nuestro último proyecto.

En este periodo logramos optimizar los tiempos de producción y alcanzar los objetivos propuestos.

Agradezco a todos los participantes por su dedicación y esfuerzo continuo. Quedo atento a sus dudas y comentarios.""".trimIndent(),
                wpm = 140,
                fontSize = 44
            )
        )
    }

    fun cleanEmptyScripts() {
        viewModelScope.launch {
            val list = allScripts.value
            val activeId = _currentScript.value?.id
            list.filter {
                it.id != activeId && it.content.isBlank() && (it.title == "Nuevo Guión" || it.title.isBlank())
            }.forEach {
                repository.deleteScript(it)
            }
        }
    }

    fun prepareNewDraft() {
        viewModelScope.launch {
            val newScript = Script(
                title = "Nuevo Guión",
                content = "",
                wpm = _settings.value.wpm,
                fontSize = _settings.value.fontSize
            )
            val newId = repository.insertScript(newScript)
            val created = newScript.copy(id = newId)
            _currentScript.value = created
        }
    }

    fun createNewBlankScript(onCreated: (Script) -> Unit = {}) {
        viewModelScope.launch {
            val newScript = Script(
                title = "Nuevo Guión",
                content = "",
                wpm = _settings.value.wpm,
                fontSize = _settings.value.fontSize
            )
            val newId = repository.insertScript(newScript)
            val created = newScript.copy(id = newId)
            _currentScript.value = created
            onCreated(created)
        }
    }

    fun loadScript(id: Long) {
        viewModelScope.launch {
            val script = repository.getScriptById(id)
            if (script != null) {
                _currentScript.value = script
            }
        }
    }

    fun selectScript(script: Script) {
        _currentScript.value = script
    }

    fun updateSettings(newSettings: AppSettings) {
        _settings.value = newSettings
    }

    fun saveScript(title: String, content: String, wpm: Int? = null, fontSize: Int? = null) {
        viewModelScope.launch {
            val script = _currentScript.value
            val finalWpm = wpm ?: _settings.value.wpm
            val finalSize = fontSize ?: _settings.value.fontSize

            if (script != null && script.id > 0) {
                val updated = script.copy(
                    title = title.ifBlank { "Nuevo Guión" },
                    content = content,
                    wpm = finalWpm,
                    fontSize = finalSize,
                    updatedAt = System.currentTimeMillis()
                )
                repository.updateScript(updated)
                _currentScript.value = updated
            } else {
                val newScript = Script(
                    title = title.ifBlank { "Nuevo Guión" },
                    content = content,
                    wpm = finalWpm,
                    fontSize = finalSize
                )
                val newId = repository.insertScript(newScript)
                _currentScript.value = newScript.copy(id = newId)
            }
        }
    }

    fun createNewScript() {
        createNewBlankScript()
    }

    fun importScript(title: String, content: String, onImported: (Long) -> Unit = {}) {
        viewModelScope.launch {
            val newScript = Script(
                title = title.ifEmpty { "Guión Importado" },
                content = content,
                wpm = _settings.value.wpm,
                fontSize = _settings.value.fontSize
            )
            val newId = repository.insertScript(newScript)
            val created = repository.getScriptById(newId) ?: newScript.copy(id = newId)
            _currentScript.value = created
            onImported(created.id)
        }
    }

    fun cloneScript(script: Script) {
        viewModelScope.launch {
            val cloned = Script(
                title = "${script.title} (Copia)",
                content = script.content,
                wpm = script.wpm,
                fontSize = script.fontSize
            )
            repository.insertScript(cloned)
        }
    }

    fun deleteScript(script: Script) {
        viewModelScope.launch {
            repository.deleteScript(script)
            _currentScript.value = null
        }
    }
}
