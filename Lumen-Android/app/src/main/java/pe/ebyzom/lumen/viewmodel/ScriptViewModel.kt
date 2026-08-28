package pe.ebyzom.lumen.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import pe.ebyzom.lumen.data.repository.ScriptRepository
import pe.ebyzom.lumen.model.Script

class ScriptViewModel(private val repository: ScriptRepository) : ViewModel() {

    val allScripts: StateFlow<List<Script>> = repository.allScripts
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _currentScript = MutableStateFlow<Script?>(null)
    val currentScript: StateFlow<Script?> = _currentScript

    fun loadScript(id: Long) {
        viewModelScope.launch {
            _currentScript.value = repository.getScriptById(id)
        }
    }

    fun saveScript(title: String, content: String, wpm: Int = 135, fontSize: Int = 48) {
        viewModelScope.launch {
            val script = _currentScript.value
            if (script != null) {
                repository.updateScript(script.copy(
                    title = title,
                    content = content,
                    wpm = wpm,
                    fontSize = fontSize,
                    updatedAt = System.currentTimeMillis()
                ))
            } else {
                repository.insertScript(Script(
                    title = title,
                    content = content,
                    wpm = wpm,
                    fontSize = fontSize
                ))
            }
        }
    }

    fun deleteScript(script: Script) {
        viewModelScope.launch {
            repository.deleteScript(script)
        }
    }
}
