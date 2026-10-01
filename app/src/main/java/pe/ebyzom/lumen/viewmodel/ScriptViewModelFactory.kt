package pe.ebyzom.lumen.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import pe.ebyzom.lumen.data.repository.ScriptRepository

class ScriptViewModelFactory(private val repository: ScriptRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(ScriptViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return ScriptViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
